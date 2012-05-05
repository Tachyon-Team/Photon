macro header_size()
{
    return @{["number", photon.send(photon.object, "__header_size__") / photon.send(photon.object, "__ref_size__")]}@;
}

macro patch_inline_cache(map, rcv_map, value, head_offset, patch_value)
{
    return @{(function () {
              var cache_offset    = -38;
              var op_offset       = -8;
              var map_offset      = -14;

              var next_field      = 0;
              var previous_field  = 4;

              var SETUP = _label();
              var END   = _label();
             
              return ["begin",
                ["get", "head_offset"],
                ["code", _op("push", _EAX)],
                ["get", "map"],
                ["code", _op("push", _EAX)],
                ["get", "rcv_map"],
                ["code", _op("push", _EAX)],
                ["get", "value"],
                ["code", _op("push", _EAX)],
                ["code", _assemble([
                    _op("mov", _mem(4, _EBP), _EDX),         // Retrieve Return Address 
                    _op("add", _$(cache_offset), _EDX),      // Retrieve Inline cache pointer

                    // Invalidate current cache
                    _op("cmp", _$(_UNDEFINED), _mem(map_offset, _EDX), 32), // If inline cache has not been initialized yet,
                    _op("je", SETUP),                                       // skip invalidation

                    _op("mov", _mem(previous_field, _EDX), _EAX), // Retrieve previous node pointer
                    _op("mov", _mem(next_field, _EDX), _ECX),     // Retrieve next node pointer

                    _op("mov", _ECX, _mem(next_field, _EAX)),     // Set previous node's next field to next node
                    _op("cmp", _$(_NIL), _ECX),                    
                    _op("je", SETUP),
                    _op("mov", _EAX, _mem(previous_field, _ECX)), // Set next node's previous field to previous node

                    // Setup current cache to new value
                    SETUP])],

                ["get", "patch_value"],
                ["code", _assemble([
                    _op("pop", _EAX),                                  // Retrieve rcv map
                    _op("mov", _EAX,     _mem(map_offset, _EDX), 32),  // Save map in inline cache

                    // Link cache in cache list
                    _op("pop", _EAX),                                  // Retrieve cache map
                    _op("pop", _ECX),                                  // Retrieve cache offset on map
                    _op("sar", _$(1), _ECX),                           // Unbox fixnum
                    _op("lea", _mem(0, _EAX, _ECX), _EAX),             // Retrieve pointer to head of list
                    _op("mov", _mem(next_field, _EAX), _ECX),          // Retrieve pointer to next node

                    // EAX: Head of list
                    // ECX: Pointer to next node
                    // EDX: Pointer to current node (current cache) 
                    _op("mov", _EAX, _mem(previous_field, _EDX)),   // Set previous to head of list
                    _op("mov", _EDX, _mem(next_field, _EAX)),       // Set head of list's next field to current node 
                    _op("mov", _ECX, _mem(next_field, _EDX)),       // Set current node's next field to next node

                    _op("cmp", _$(_NIL), _ECX),
                    _op("je", END),
                    _op("mov", _EDX, _mem(previous_field, _ECX)),   // Set next node's previous to current node
                    END
                ])]];})()}@;
}

macro patch_method_value()
{
    return @{(function () {
        var op_offset = -8;

        return ["code", [
            _op("mov", _$(0xb8), _mem(op_offset,   _EDX), 8),   // Set operation to move immediate value
            _op("mov", _$(0x90), _mem(op_offset+5, _EDX), 8),   // Add a nop byte to align on 6 bytes
            _op("pop", _EAX),                                   // Retrieve method
            _op("mov", _EAX,     _mem(op_offset+1, _EDX), 32)   // Set the method reference in move op
        ]];})()}@;
}

macro return_address()
{
    return @{["code", [_op("mov", _mem(4,_EBP), _EAX)]]}@;
}

macro current_node()
{
    return @{["code", [
        _op("mov", _mem(4,_EBP), _EAX),
        _op("sub", _$(35), _EAX) ]]}@;
}

macro ptr_write(ptr, offset, v)
{
    return @{["begin",
                ["get", "offset"],
                ["code", _op("mov", _EAX, _EDX)],
                ["get", "ptr"],
                ["code", _op("mov", _EAX, _ECX)],
                ["get", "v"],
                ["code", _op("mov", _EAX, _mem(0, _ECX, _EDX))]]}@;
}

(function () {
    var get_cache = [];
    var set_cache = [];

    function getp(offset)
    {
        var pos_offset = -offset;

        if (get_cache[pos_offset] === undefined)
        {
            var physical_offset = offset - header_size();
            get_cache[pos_offset] = function (p)
            {
                return this[@-5][@physical_offset];
            };
        }

        return get_cache[pos_offset];
    }

    function setp(offset, value_cache_offset)
    {
        var pos_offset = -offset;

        if (set_cache[pos_offset] === undefined)
        {
            var physical_offset    = offset - header_size();
            value_cache_offset = value_cache_offset / 4;

            set_cache[pos_offset] = function (p, v)
            {
                var that = this[@-5];

                // Make sure there is nothing to invalidate
                if (that[@-1][@value_cache_offset] === null)
                {
                    // Assign value
                    return that[@physical_offset] = v;
                } else
                {
                    //"// setp cache invalidation required".__print__();
                    return orig_set.call(this, p, v);
                }
            };
        }

        return set_cache[pos_offset];
    }

    function get_map(o, p)
    {
        var rcv = o;

        while (rcv !== null)
        {
            var map = rcv[@-5][@-1];
            if (map.__lookup__(p) !== undefined)
            {
                return map;
            }

            rcv = rcv[@-2];
        }

        return undefined;
    }

    var orig_get = Object.prototype.__get__;

    Object.prototype.__get__ = function (p)
    {
        var l_offset = undefined;
        var l_rcv  = this;

        l_rcv    = l_rcv[@-5];
        l_offset = l_rcv[@-1].__lookup__(p);

        if (l_offset !== undefined)
        {

            // Optimize away the property lookup when
            // the property is found on the object itself
            // and is constant
            if ($arguments_length > 1 && 
                $arguments[@1] === true)
            {
                var map = get_map(this, "__get__");

                if (map !== undefined)
                {
                    var head_offset = map.__value_cache_offset__("__get__");
                    var f = getp(l_offset);

                    //"// patching __get__".__print__();

                    patch_inline_cache(
                        map,
                        l_rcv[@-1], 
                        f,
                        head_offset, 
                        patch_method_value()
                    );
                }
            }

            return l_rcv[@l_offset - header_size()];
        }

        // Otherwise perform a regular lookup
        while (l_rcv !== null)
        {
            l_rcv    = l_rcv[@-5];
            l_offset = l_rcv[@-1].__lookup__(p);

            if (l_offset !== undefined)
            {
                return l_rcv[@l_offset - header_size()];
            }
            
            l_rcv = l_rcv[@-2];
        }

        return undefined;
    };

    var orig_fn_get = @{["ref", photon["function"]]}@.__get__;
    @{["ref", photon["function"]]}@.__get__ = function (p)
    {
        var l_offset = undefined;
        var l_rcv  = this;

        l_rcv    = l_rcv[@-5];
        l_offset = l_rcv[@-1].__lookup__(p);

        if (l_offset !== undefined)
        {

            // Optimize away the property lookup when
            // the property is found on the object itself
            // and is constant
            if ($arguments_length > 1 && 
                $arguments[@1] === true)
            {
                var map = get_map(this, "__get__");

                if (map !== undefined)
                {
                    var head_offset = map.__value_cache_offset__("__get__");
                    var f = getp(l_offset);

                    //"// patching function __get__".__print__();

                    patch_inline_cache(
                        map,
                        l_rcv[@-1], 
                        f,
                        head_offset, 
                        patch_method_value()
                    );
                }
            }

            return l_rcv[@l_offset - header_size()];
        } else
        {
            return orig_fn_get.call(this, p);
        }
    }

    var orig_set = Object.prototype.__set__;

    Object.prototype.__set__ = function (p, v)
    {
        var l_offset = undefined;
        var l_rcv  = this;

        l_rcv    = l_rcv[@-5];
        l_offset = l_rcv[@-1].__lookup__(p);

        if (l_offset !== undefined)
        {
            // Optimize away the property lookup when
            // the property is found on the object itself
            // and is constant
            if ($arguments_length > 2 && 
                $arguments[@2] === true)
            {
                var map = get_map(this, "__set__");

                if (map !== undefined)
                {
                    var head_offset = map.__value_cache_offset__("__set__");
                    var f = setp(l_offset, l_rcv[@-1].__value_cache_offset__(p));

                    //"// patching __set__".__print__();

                    patch_inline_cache(
                        map,
                        l_rcv[@-1], 
                        f,
                        head_offset, 
                        patch_method_value()
                    );
                }
            }
        }

        return orig_set.call(this, p, v);
    };

    photon.optimize_get = true;
    photon.optimize_set = true;
})();
