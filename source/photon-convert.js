var root = {
    array:      @{["ref", photon.array]}@,
    cell:       @{["ref", photon.cell]}@,
    fixnum:     @{["ref", photon.fixnum]}@,
    "function": @{["ref", photon.function]}@,
    global:     @{["ref", photon.global]}@,
    map:        @{["ref", photon.map]}@,
    object:     @{["ref", photon.object]}@,
    symbol:     @{["ref", photon.symbol]}@
};

macro root_array()
{
    return @{["ref", new_root.array]}@;
}

macro root_fixnum()
{
    return @{["ref", new_root.fixnum]}@;
}

macro root_function()
{
    return @{["ref", new_root.function]}@;
}

macro root_map()
{
    return @{["ref", new_root.map]}@;
}

macro root_object()
{
    return @{["ref", new_root.object]}@;
}

macro root_symbol()
{
    return @{["ref", new_root.symbol]}@;
}

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

macro object_store_byte(o, offset, b)
{
    return @{["begin",
        ["get", "b"],
        ["code", _op("push", _EAX)],
        ["get", "offset"],
        ["code", _op("push", _EAX)],
        ["get", "o"],
        ["code", 
            [_op("pop", _ECX),
             _op("sar", _$(1), _ECX),
             _op("pop", _EDX),
             _op("sar", _$(1), _EDX),
             _op("mov", _reg.dl, _mem(0, _EAX, _ECX))]],
        ["get", "b"]
    ]}@;
}

macro object_load_byte(o, offset)
{
    return @{["begin",
        ["get", "offset"],
        ["code", _op("push", _EAX)],
        ["get", "o"],
        ["code", 
            [_op("pop", _ECX),
             _op("sar", _$(1), _ECX),
             _op("mov", _mem(0, _EAX, _ECX), _EAX),
             _op("and", _$(0xFF), _EAX),
             _op("sal", _$(1), _EAX),
             _op("add", _$(1), _EAX)]]
    ]}@;
}
macro object_store_ref(o, offset, r)
{
    return @{["begin",
        ["get", "r"],
        ["code", _op("push", _EAX)],
        ["get", "offset"],
        ["code", _op("push", _EAX)],
        ["get", "o"],
        ["code", 
            [_op("pop", _ECX),
             _op("sar", _$(1), _ECX),
             _op("pop", _EDX),
             _op("mov", _EDX, _mem(0, _EAX, _ECX))]],
        ["get", "r"]
    ]}@;
}

macro object_load_ref(o, offset)
{
    return @{["begin",
        ["get", "offset"],
        ["code", _op("push", _EAX)],
        ["get", "o"],
        ["code", 
            [_op("pop", _ECX),
             _op("sar", _$(1), _ECX),
             _op("mov", _mem(0, _EAX, _ECX), _EAX)]]
    ]}@;
}

macro convert(o)
{
    return (o === undefined) ? undefined :
           (o === null)      ? null      :
           (o === true)      ? true      :
           (o === false)     ? false     :
           (ref_is_fixnum(o))? o         :
           o.__convert__();
}

macro sizeof_ref_m()
{
    return 4;
}

(function () {

    // For all objects using the new representation
    // the conversion should be the identity
    root_object().__convert__ = function ()
    {
        return this;
    }
    
    root.array.__convert__ = function ()
    {
        print("Testing for previous conversion");
        if (this[@-1].__lookup__("__self__") !== undefined)
        {
            print("Previous conversion found");
            return this.__self__;
        }

        print("Creating new_array");
        var new_array = root_array().__new__(this[@0]); 

        print("Setting array length");
        new_array.length = this[@0];

        /*
        for (var p in this)
        {
            var v = this[p];
            new_array[p] = convert(v);
        }
        */

        print("Copying indexed values");
        for (var i = 0; i < new_array.length; ++i)
        {
            new_array[i] = this[i];    
        }

        print("Converting __proto__");
        new_array.__proto__ = convert(this[@-2]);

        print("Setting __self__");
        this.__self__ = new_array;
       
        print("Returning new_array");
        return new_array;
    }
    root.array.__self__ = root_array();

    root.function.__convert__ = function ()
    {
        if (this.__self__ !== undefined)
        {
            return this.__self__;
        }

        var new_function = root_function().__new__(this.__payload_size__);

        var payload_size = this[@-3];
        for (var i = 0; i < payload_size; ++i)
        {
            object_store_byte(new_function, i, 
                object_load_byte(this, i));
        }

        new_function.__proto__ = this[@-2].__convert__();

        var ref_nb = this.__ref_nb__();
        for (var i = 0; i < ref_nb; ++i)
        {
            var r = this.__load_ref__(i).__convert__();
            this.__store_ref__(i, r);
        }

        // TODO: For each captured variable convert

        // TODO: Recompile function if layout changes
        //       assumptions in compiled code

        return new_function;
    }
    root.function.__self__ = root_function(); 

    root.function.__ref_nb__ = function ()
    {
        var offset = this[@-3] - sizeof_ref_m();
        return object_load_ref(this, offset); 
    }

    root.function.__load_ref__ = function (i)
    {
        // Retrieve offset from beginning of function
        var offset = this[@-3] - i*sizeof_ref_m() - 2*sizeof_ref_m();
        offset = object_load_ref(this, offset); 

        // Retrieve reference in the source code
        return object_load_ref(this, offset);
    }

    root.function.__store_ref__ = function (i, r)
    {
        // Retrieve offset from beginning of function
        var offset = this[@-3] - i*sizeof_ref_m() - 2*sizeof_ref_m();
        offset = object_load_ref(this, offset); 

        // Store reference in the source code
        return object_store_ref(this, offset, r);
    }


    root.map.__convert__ = function ()
    {
        print("ERROR! maps should never have been accessed for conversion");
    }

    root.object.__convert__ = function ()
    {
        if (this.__self__ !== undefined)
        {
            return this.__self__;
        }

        var new_object = root_object().__new__();

        for (var p in this)
        {
            var v = this[p];
            new_object[p] = convert(v);
        }

        new_object.__proto__ = convert(this.__proto__);

        this.__self__ = new_object;
        return new_object;
    }

    root.symbol.__convert__ = function ()
    {
        return root_symbol().__intern__(this);
    }

    // TODO: convert root symbol symbols to the new ones ;-)
})();
