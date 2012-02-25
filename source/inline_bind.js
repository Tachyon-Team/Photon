macro ref_is_fixnum(r)              
{
    return @{["begin", 
        ["get", "r"],
        ["code",
            [_op("mov", _EAX, _ECX),
             _op("and", _$(1), _ECX),
             _op("mov", _$(_TRUE), _EAX),
             _op("mov", _$(_FALSE), _ECX),
             _op("cmovz", _ECX, _EAX)]]
    ]}@;
}

macro ref_is_constant(r)
{
    return r === undefined || r === null || r === true || r === false;
}

macro dynamic_lookup(map, msg)
{
    return map.__lookup__(msg);
}

macro header_size()
{
    return @{["number", photon.send(photon.object, "__header_size__") / photon.send(photon.object, "__ref_size__")]}@;
}

macro patch_inline_cache(map, rcv_map, value, head_offset, patch_value)
{
    return @{(function () {
              var cache_offset    = -27;
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

macro patch_method_location()
{
    return @{(function () {
        var op_offset = -8;

        return ["code", [
            _op("mov", _$(0x818b), _mem(op_offset,   _EDX), 16), // Set operation to move immediate value
            _op("pop", _EAX),                                    // Retrieve method
            _op("dec", _EAX),                                    // Unbox and convert to byte offset
            _op("sal", _$(1), _EAX),                             
            _op("mov", _EAX,       _mem(op_offset+2, _EDX), 32)  // Set the location offset
        ]];})()}@;
}

// No inline cache are used inside of bind by virtue of using the vanilla send generation code during compilation
function inline_bind(msg, n, rcv, closure)
{
    if (ref_is_fixnum(rcv))
    {
        var l_rcv = @{["ref", photon.fixnum]}@[@-5];
        var l_offset = dynamic_lookup(l_rcv[@-1], msg);
        return ref_is_fixnum(l_offset) ? l_rcv[@l_offset - header_size()] : l_offset;
    } else if (ref_is_constant(rcv))
    {
        var l_rcv = @{["ref", photon.constant]}@[@-5];
        var l_offset = dynamic_lookup(l_rcv[@-1], msg);
        return ref_is_fixnum(l_offset) ? l_rcv[@l_offset - header_size()] : l_offset;
    } else if (msg === "__lookup__" && rcv === rcv[@-1])
    {
        var l_rcv    = @{["ref", photon.map]}@[@-5];
        var l_offset = 
            @{["ccall",
                  ["ref",    photon.send(photon.map, "__get__", "__lookup__")],
                  ["number", 1],
                  ["ref",    photon.map],
                  ["get", "null"],
                  ["string", "__lookup__"]]}@;
        return (ref_is_fixnum(l_offset)) ? l_rcv[@l_offset - header_size()] : l_offset;
    }



    var l_offset = undefined;
    var l_rcv   = rcv;
    var rcv_ext = rcv[@-5];

    while (l_rcv !== null)
    {
        l_rcv = l_rcv[@-5];

        l_offset = dynamic_lookup(l_rcv[@-1], msg);

        if (l_offset !== undefined)
        {
            if (!ref_is_fixnum(l_offset)) return l_offset;

            var offset      = l_offset - header_size();
            var map         = l_rcv[@-1];

            if (l_rcv === rcv_ext)
            {
                //print("patching location for msg:");
                //print(msg);
                var head_offset = map.__location_cache_offset__(msg);
                patch_inline_cache(map, map, offset, head_offset, patch_method_location());
                return l_rcv[@offset];
            } else
            {
                //print("patching value for msg:");
                //print(msg);
                var head_offset = map.__value_cache_offset__(msg);
                patch_inline_cache(map, rcv_ext[@-1], l_rcv[@offset], head_offset, patch_method_value());
                return l_rcv[@offset];
            }
        }
        
        l_rcv = l_rcv[@-2];
    }

    throw "send message not understood: '".concat(msg).concat("'");

    return undefined;
}
