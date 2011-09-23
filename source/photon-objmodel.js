var root = {
    array:      @{["ref", photon.array]}@,
    "function": @{["ref", photon.function]}@,
    global:     @{["ref", photon.global]}@,
    map:        @{["ref", photon.map]}@,
    object:     @{["ref", photon.object]}@,
    symbol:     @{["ref", photon.symbol]}@
};

// Constants
const sizeof_ref                   = 4;
const sizeof_header                = 4*sizeof_ref;
const sizeof_property              = 4*sizeof_ref; 

const array_value_offset           = 1;
const default_object_value_nb      = 4;
const default_map_payload_size     = 10*sizeof_property + 2*sizeof_ref;
const map_length_offset            = 0;
const map_properties_offset        = 1;
const object_payload_size_offset   = -3;
const object_flags_offset          = -4;
const object_values_offset         = -4;

//--------------------------------- C Primitives -------------------------------

//@{["ref", photon.function]}@.__allocate__ = function (values_size, payload_size) {}
//@{["ref", photon.function]}@.__intern__   = function (code) {}

//@{["ref", photon.object]}@.__allocate__   = function (values_size, payload_size) {}


//--------------------------------- Macros -------------------------------------
macro array_indexed_value_get(a, i)             
{
    return a[@i + array_value_offset];
}
macro array_indexed_value_set(a, i, v)             
{
    return a[@i + array_value_offset] = v;
}
macro array_indexed_values_count_get(a)  
{
    return a[@0];
}
macro array_indexed_values_count_set(a, v)
{
    return a[@0] = v;
}
macro array_indexed_values_size_get(a)  
{
    return (object_payload_size(a) - sizeof_ref) / sizeof_ref;
}
macro map_length_get(m)
{
    // FIXME: Hard-coded constant until constant propagation is implanted
    return m[@0];
}
macro map_length_set(m, v)
{
    // FIXME: Hard-coded constant until constant propagation is implanted
    return m[@0] = v;
}
macro map_next_offset_get(m)
{
    // FIXME: Hard-coded constant until constant propagation is implanted
    return m[@1];
}
macro map_next_offset_set(m, v)
{
    // FIXME: Hard-coded constant until constant propagation is implanted
    return m[@1] = v;
}
macro map_properties_size(m)        
{
    return ((object_payload_size(m) - 2*sizeof_ref) / sizeof_property);
}
macro map_property_name_get(m,i)    
{
    // FIXME: Hard-coded constant until constant propagation is implanted
    return m[@i*4 + 2];
}
macro map_property_name_set(m,i,v)  
{
    // FIXME: Hard-coded constant until constant propagation is implanted
    return m[@i*4 + 2] = v;
}
macro map_property_location_get(m,i)  
{
    // FIXME: Hard-coded constant until constant propagation is implanted
    return m[@i*4 + 3];
}
macro map_property_location_set(m,i,v)
{
    // FIXME: Hard-coded constant until constant propagation is implanted
    return m[@i*4 + 3] = v;
}
macro map_values_are_immutable(m)   
{
    return (m[@object_flags_offset] & 0x10000) !== 0;
}
macro map_values_set_immutable(m)   
{
    return m[@object_flags_offset] |= 0x10000;
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
macro object_map(o)
{
    return o[@-1];
}
macro object_payload_size(o)    
{
    // FIXME: Hard-coded constant until constant propagation is implanted
    return o[@-3];
}
macro object_proto(o)
{
    return o[@-2];
}
macro object_value_get(o, i)
{
    // FIXME: Hard-coded constant until constant propagation is implanted
    return o[@i + -4];
}
macro object_value_set(o, i, v)
{
    return o[@i + object_values_offset] = v;
}
macro object_values_count_dec(o)    
{
    return o[@object_flags_offset] -= 1;
}
macro object_values_count_inc(o)    
{
    return o[@object_flags_offset] += 1;
}
macro object_values_count_get(o)    
{
    return o[@object_flags_offset] & 255;
}
macro object_values_count_set(o, c) 
{
    return o[@object_flags_offset] = (o[@object_flags_offset] & -256) | (c & 255);
}
macro object_values_size_get(o)         
{
    return (o[@object_flags_offset] & 0xFF00) >> 8;
}
macro object_values_size_set(o, s)  
{
    return o[@object_flags_offset] = (o[@object_flags_offset] & -65281) | ((s & 255) << 8);
}

macro object_self(o)
{
    return o[@-5];
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


//--------------------------------- Root Objects Adjustments ------------------
/*
// Add an indirection level to existing arrays to allow reallocation
// while preserving the identity of the object
root.array.__array__              = root.array;
root.symbol.__symbols__.__array__ = root.symbol.__symbols__;

// Do the same for objects
root.array.__object__              = root.array;
root.function.__object__           = root.function;
root.global.__object__             = root.global;
root.object.__object__             = root.object;
root.symbol.__object__             = root.symbol;
root.symbol.__symbols__.__object__ = root.symbol.__symbols__;
//root.map.__object__                = root.map;

// TODO: Add __object__ property to existing non-root maps
*/


//--------------------------------- Bootstrap ---------------------------------
(function () {
    var ss_map = root.map.__clone__(object_payload_size(root.map));

    object_map(ss_map)     = root.map;
    object_proto(ss_map)   = root.map;

    function map_add_property(m, name, f)
    {

        for (var i = 0; i < map_length_get(m); ++i)
        {
            if (m[@4*i + 1] === name)
            {
                m[@4*i + 2] = f;
                return;
            }
        }
        
        var i = map_length_get(m);
        m[@4*i+1] = name;
        m[@4*i + 2] = f;
        map_length_set(m, i+1);
    }

    map_add_property(ss_map, "__add_property__", function (name, value)
    {
        for (var i = 0; i < map_length_get(this); ++i)
        {
            if (map_property_name_get(this, i) === name)
            {
                map_property_location_set(this, i, value);
                return;
            }
        }

        var i = map_length_get(this);
        map_property_name_set(this, i, name);
        map_property_location_set(this, i, value);
        map_length_set(this, i+1);
    });


    map_add_property(ss_map, "__lookup__", function (name)
    {
        for (var i = 0; i < map_length_get(this); ++i)
        {
            if (name === map_property_name_get(this, i))
            {
                return map_property_location_get(this, i);    
            }
        }

        return undefined;
    });

    map_add_property(ss_map, "__set__", function (name, value)
    {
        var offset = this.__map__.__lookup__(name);

        if (ref_is_fixnum(offset))
        {
            return object_value_set(this, offset, value);
        }

        return false;
    });

    map_add_property(ss_map, "__map__", 3);
    map_add_property(ss_map, "__proto__", 2);
    map_add_property(ss_map, "__payload_size__", 1);
    map_add_property(ss_map, "__flags__", 0);
    map_add_property(ss_map, "length", 4);
    map_add_property(ss_map, "__next_offset__", 5);
    map_add_property(ss_map, "__object__", -1);

    var root_map = root.object.__allocate__(1, 20*sizeof_property + 2*sizeof_ref); 

    object_map(root_map)     = ss_map;
    object_proto(root_map)   = ss_map;

    object_values_count_inc(root_map);

    root_map.length          = 0;
    root_map.__next_offset__ = -2;

    //print(root_map.length);
    //print(root_map.__next_offset__);

    // Adding properties for maps
    root_map.__add_property__("__map__",          3);
    root_map.__add_property__("__proto__",        2);
    root_map.__add_property__("__payload_size__", 1);
    root_map.__add_property__("__flags__",        0);
    root_map.__add_property__("length",           4);
    root_map.__add_property__("__next_offset__",  5);
    root_map.__add_property__("__object__",      -1);

    // Adding methods for maps
    root_map.__add_property__("__add_property__",
            ss_map.__lookup__("__add_property__"));

    root_map.__add_property__("__clone__",  function (payload_size) 
    {
        var new_map    = super(this).__clone__(payload_size);
        new_map.length = this.length;

        for (var i = 0; i < new_map.length; ++i)
        {
            map_property_name_set(new_map, i, 
                map_property_name_get(this, i));
            map_property_location_set(new_map, i, 
                map_property_location_get(this, i));
        }

        if (map_values_are_immutable(this))
        {
            map_values_set_immutable(new_map);
        }

        return new_map;
    });

    root_map.__add_property__("__create__", function (name) 
    {
        if (this.length === map_properties_size(this))
        {
            var payload_size = this.__payload_size__ + sizeof_property; 
        } else
        {
            var payload_size = this.__payload_size__;
        }

        var new_map = this.__clone__(payload_size);
        
        new_map.length = this.length + 1;
        new_map.__next_offset__ = this.__next_offset__;

        map_property_name_set(new_map, this.length, name);
        map_property_location_set(new_map, this.length, new_map.__next_offset__--);

        return new_map;
    });

    root_map.__add_property__("__delete__", function (name) 
    {
        return false;
    });

    root_map.__add_property__("__lookup__", function (name) 
    {
        for (var i = 0; i < map_length_get(this); ++i)
        {
            if (name === map_property_name_get(this, i))
            {
                return map_property_location_get(this, i);    
            }
        }

        return undefined;
    });

    root_map.__add_property__("__new__", function ()
    {
        var new_map = this.__allocate__(
            default_object_value_nb,
            default_map_payload_size
        );

        object_map(new_map)   = this;
        object_proto(new_map) = object_proto(this); 

        new_map.length          = 0;
        new_map.__next_offset__ = -2;

        new_map.__add_property__("__map__",          3);
        new_map.__add_property__("__proto__",        2);
        new_map.__add_property__("__payload_size__", 1);
        new_map.__add_property__("__flags__",        0);
        new_map.__add_property__("__object__",      -1);

        return new_map;
            
    });

    root_map.__add_property__("__remove__", function (name) 
    {
        var new_map = super(this).__clone__(this.__payload_size__ - sizeof_property);
        new_map.length = this.length - 1;

        for (var i = 0; i < new_map.length; ++i)
        {
            if (map_property_name_get(this, i) !== name)
            {
                // Copy property
                map_property_name_set(new_map, i, 
                    map_property_name_get(this, i));
                map_property_location_set(new_map, i, 
                    map_property_location_get(this, i));
            } else
            {
                // The deleted property is not the last one,
                // move the last property in the deleted property
                // slot.
                map_property_name_set(new_map, i, 
                    map_property_name_get(this, new_map.length));
                map_property_location_set(new_map, i, 
                    map_property_location_get(this, i));
            }

        }

        return new_map;
    });

    root_map.__add_property__("__set__", function (name, value)
    {
        var offset = object_map(this).__lookup__(name);

        if (ref_is_fixnum(offset))
        {
            return object_value_set(this, offset, value);
        }

        return false;
    });

    for (var i = 0; i < root_map.length; ++i)
    {
        map_add_property(ss_map, map_property_name_get(root_map, i),
            map_property_location_get(root_map, i));
    }

    var map = root_map.__new__();

    // Root object methods
    map.__add_property__("__allocate__", root.object.__allocate__);

    map.__add_property__("__clone__", function (payload_size) 
    {
        var clone = this.__allocate__(object_values_size_get(this), payload_size);    

        for (var i = 1; i <= object_values_size_get(this); ++i)
        {
            object_value_set(clone, -i, object_value_get(this, -i));
        }

        object_map(clone)   = object_map(this);
        object_proto(clone) = object_proto(this);

        return clone;
    });

    map.__add_property__("__delete__", function (name) 
    {
        var offset = object_map(this).__lookup__(name);

        if (offset === undefined)
        {
            return false;
        } else
        {
            var new_map      = object_map(this).__remove__(name);
            object_map(this) = new_map;
            
            // If the deleted property is not the last, move the value of the last
            // property in the deleted slot
            if (-offset < object_values_count_get(this))
            {
                object_value_set(this, offset, 
                    object_value_get(this, -object_values_count_get(this)));
            }

            object_values_count_dec(this);
            
            return true;
        }
    });

    map.__add_property__("__get__", function (name)
    {
        var value = undefined;
        var rcv   = this; 

        while (rcv !== null)
        {
            value = object_map(rcv).__lookup__(name);

            if (value !== undefined)
            {
                if (ref_is_fixnum(value))
                    return object_value_get(rcv, value);
                else
                    return value; 
            }
            
            rcv = object_proto(rcv);
        }

        return undefined;
    });

    map.__add_property__("__new__", function (payload_size) 
    {
        var new_map         = this.__map__.__map__.__new__();
        var child           = this.__clone__(payload_size);
        object_map(child)   = new_map;
        object_proto(child) = this;

        return child;
    });

    map.__add_property__("__set__", function (name, value) 
    {
        var obj = this;

        var offset = object_map(obj).__lookup__(name);

        if (offset === undefined)
        {
            if (object_values_count_get(obj) >= object_values_size_get(obj))
            {
                // TODO
                print("TODO: add extension support to objects");

            } else
            {
                var new_map      = object_map(obj).__create__(name);
                var offset       = new_map.__lookup__(name);

                object_map(obj) = new_map;
                object_values_count_inc(obj);
                return object_value_set(obj, offset, value);
            }
        } else
        {
            return object_value_set(obj, offset, value);
        }
    });

    // Root object
    var object = root.object.__new__();
    object_map(object) = map;
    object_proto(object) = null;

    root_map.__proto__ = object;
    map.__proto__ = object;

    var array = object.__new__(sizeof_ref);

    array.__map__.__add_property__("length", 4);
    array.length = 0;

    array.__map__.__add_property__("__delete__", function (name) 
    {
        if (ref_is_fixnum(name))
        {
            return false;
        } else if (name === "length")
        {
            return false;
        } else
        {
            return super(this).__delete__(name);
        }
    });

    array.__map__.__add_property__("__get__", function (name) 
    {   
        if (ref_is_fixnum(name) && name >= 0)
        {
            if (name >= this.length)
            {
                return undefined;
            } else
            {
                return array_indexed_value_get(this, name);
            }
        } else
        {
            return super(this).__get__(name);
        }
    });

    array.__map__.__add_property__("__new__", function (size) 
    {
        var new_array = this.__allocate__(4, (size + 1) * sizeof_ref); 
        var new_map = this.__map__.__map__.__new__();
        object_map(new_array)   = new_map;
        object_proto(new_array) = this;

        new_map.__add_property__("length", 4);
        array_indexed_values_count_set(new_array, 0);

        return new_array;
    });

    array.__map__.__add_property__("__push__", function (value) 
    {
        return this.__set__(this.length, value);
    });

    array.__map__.__add_property__("__set__", function (name, value) 
    {
        var array = this;

        if (ref_is_fixnum(name) && name >= 0)
        {
            if (name >= array.length)
            {
                if (name >= array_indexed_values_size_get(array))
                {
                    var new_array = array.__new__(name * 2);

                    new_array.length = name + 1;

                    for (var i = 0; i < array.length; ++i)
                    {
                        new_array[i] = array[i];
                    }

                    array = new_array;
                    this.__array__ = new_array;
                } else
                {
                    array_indexed_values_count_set(array, name + 1);
                }
            }

            array_indexed_value_set(array, name, value);
        } else if (name === "length" && ref_is_fixnum(value))
        {
            if (value > array.length)
            {
                if (value >= array_indexed_values_size_get(array))
                {
                    var new_array = array.__new__(value);

                    for (var i = 0; i < array.length; ++i)
                    {
                        new_array[i] = array[i];
                    }

                    array = new_array;
                    this.__array__ = new_array;
                } 

                for (var i = array.length; i < value; ++i)
                {
                    array_indexed_value_set(array, i, undefined);
                }
            }

            array_indexed_values_count_set(array, value);
        } else
        {
            return super(this).__set__(name, value);
        }

        return value;
    });

    // Root symbol
    var symbol_map = root_map.__new__();
    symbol_map.__add_property__("__intern__", function (string)
    {
        var symbols = this.__symbols__;

        function streq(s1, s2)
        {
            var b1, b2;
            var i = 0;
            do {
                b1 = object_load_byte(s1, i);
                b2 = object_load_byte(s2, i);

                if (b1 !== b2)
                {
                    return false;
                }

                i++;
            } while (b1 !== 0 && b2 !== 0);

            if (b1 !== 0 || b2 !== 0)
            {
                return false;
            } else
            {
                return true;
            }
        }

        for (var i = 0; i < symbols.length; ++i)
        {
            if (streq(string, symbols[i]))
                return symbols[i];
        }

        var new_symbol = this.__new__(string);
        symbols.__push__(new_symbol);

        return new_symbol;
    });

    symbol_map.__add_property__("__new__", function (string)
    {
        function strlen(s)
        {
            var i = 0;
            var b;

            do 
            {
                b = object_load_byte(s, i);
                i++;
            } while (b !== 0);
            
            return i;
        }

        function strcpy(copy, string)
        {
            var i = 0;
            var b;

            do 
            {
                b = object_load_byte(string, i);
                object_store_byte(copy, i, b);
                i++;
            } while (b !== 0);
        }

        var new_symbol = this.__allocate__(0, strlen(string));

        object_map(new_symbol)   = this.__map__.__map__.__new__();
        object_proto(new_symbol) = this;

        strcpy(new_symbol, string);

        return new_symbol; 
    });

    symbol_map.__next_offset__ = -3;

    var symbol = object.__new__(1);
    object_store_byte(symbol, 0, 0);

    symbol.__map__ = symbol_map;

    symbol.__symbols__ = array.__new__(100);

    var s = root.symbol.__symbols__[0];
    symbol.__intern__(s);

    var s = root.symbol.__symbols__[1];
    symbol.__intern__(s);


    // Converting old symbols to new representation
    for (var i = 0; i < root.symbol.__symbols__[@0]; ++i)
    {
        var s = root.symbol.__symbols__[i];

        symbol.__intern__(s);
    }


    var fn = object.__new__(0);
    fn.__map__.__add_property__("__intern__", function (code)
    {
        for (var i = 0; i < code.length; ++i)
        {
            object_store_byte(this, i, code[i]);
        }

        return this;
    });

    fn.__map__.__add_property__("__new__", function (size)
    {
        var new_fct = this.__allocate__(4, size);

        object_map(new_fct)   = this.__map__.__map__.__new__();
        object_proto(new_fct) = this;

        return new_fct;
    });

    fn.__map__.__add_property__("__allocate__", root.function.__allocate__);

    var code = array.__new__(7);
    code.__push__(0xb8);
    code.__push__(9);
    code.__push__(0);
    code.__push__(0);
    code.__push__(0);
    code.__push__(0xc3);

    var new_fn = fn.__new__(7);
    new_fn.__intern__(code);

})();




//--------------------------------- Object Primitives -------------------------
/*
root.array.__delete__ = function (name) 
{
    if (ref_is_fixnum(name))
    {
        return false;
    } else if (name === "length")
    {
        return false;
    } else
    {
        return super(this).__delete__(name);
    }
}

root.array.__get__ = function (name) 
{   
    if (ref_is_fixnum(name) && name >= 0)
    {
        if (name >= this.__array__.length)
        {
            return undefined;
        } else
        {
            return array_indexed_value_get(this.__array__, name);
        }
    } else if (name === "length")
    {
        return array_indexed_values_count_get(this.__array__);
    } else     
    {
        return super(this).__get__(name);
    }
}

root.array.__new__ = function (size) 
{
    var new_array = this.__allocate__(4, (size + 1) * sizeof_ref); 
    object_map(new_array)   = object_map(this).__new__();     
    object_proto(new_array) = this;
    array_indexed_values_count_set(new_array, 0);

    new_array.__object__ = new_array;
    new_array.__array__  = new_array;

    return new_array;
}

root.array.__push__ = function (value) 
{
    return this.__set__(this.length, value);
}

root.array.__set__ = function (name, value) 
{
    var array = this.__array__;
    if (ref_is_fixnum(name) && name >= 0)
    {
        if (name >= array.length)
        {
            if (name >= array_indexed_values_size_get(array))
            {
                var new_array = array.__new__(name * 2);

                new_array.length = name + 1;

                for (var i = 0; i < array.length; ++i)
                {
                    new_array[i] = array[i];
                }

                array = new_array;
                this.__array__ = new_array;
            } else
            {
                array_indexed_values_count_set(array, name + 1);
            }
        }

        array_indexed_value_set(array, name, value);
    } else if (name === "length" && ref_is_fixnum(value))
    {
        if (value > array.length)
        {
            if (value >= array_indexed_values_size_get(array))
            {
                var new_array = array.__new__(value);

                for (var i = 0; i < array.length; ++i)
                {
                    new_array[i] = array[i];
                }

                array = new_array;
                this.__array__ = new_array;
            } 

            for (var i = array.length; i < value; ++i)
            {
                array_indexed_value_set(array, i, undefined);
            }
        }

        array_indexed_values_count_set(array, value);
    } else
    {
        return super(this).__set__(name, value);
    }

    return value;
}

root.function.__new__ = function (size) 
{
    var new_fct           = this.__allocate__(default_object_value_nb, size);
    object_map(new_fct)   = object_map(this).__new__();
    object_proto(new_fct) = this;

    new_fct.__object__ = new_fct;
    new_fct.prototype = @{["ref", photon.object]}@.__new__();

    return new_fct;
}

// TODO: Check why compiled JS method do not work when setting __set_prop_offset__
root.map.__set_prop_offset__ = function (name, offset)
{
    for (var i = 0; i < map_length_get(this); ++i)
    {
        if (name === map_property_name_get(this, i))
        {
            return map_property_location_set(this, i, offset);    
        }
    }

    return false;
}


root.map.__clone__ = function (payload_size) 
{
    var new_map    = super(this).__clone__(payload_size);
    new_map.length = this.length;

    for (var i = 0; i < new_map.length; ++i)
    {
        map_property_name_set(new_map, i, 
            map_property_name_get(this, i));
        map_property_location_set(new_map, i, 
            map_property_location_get(this, i));
    }

    if (map_values_are_immutable(this))
    {
        map_values_set_immutable(new_map);
    }

    return new_map;
}

root.map.__test__ = function (name)
{
    return this.length;
}

root.map.__create__ = function (name) 
{
    if (this.length === map_properties_size(this))
    {
        var payload_size = this.__payload_size__ + sizeof_property; 
    } else
    {
        var payload_size = this.__payload_size__;
    }

    var new_map = this.__clone__(payload_size);
    
    new_map.length = this.length + 1;

    map_property_name_set(new_map, this.length, name);
    map_property_location_set(new_map, this.length, -new_map.length);

    return new_map;
}

root.map.__delete__ = function (name) 
{
    var offset = this.__lookup__(name);

    if (offset === undefined)
    {
        return false;
    } else
    {
        if (this.__map__ !== this)
        {
            // Recursively delete the property on the map's map
            var new_map = this.__map__.__remove__(name);

            // Preserve circularity on new_map
            new_map.__map__ = new_map;

            var size = object_values_size_get(this);

            if (-offset < size)
            {
                object_value_set(this, offset, 
                    object_value_get(this, -size));
                object_value_set(new_map, offset, 
                    object_value_get(new_map, -size));
            }

            object_values_count_dec(this);
            object_values_count_dec(new_map);

        } else
        {
            // Deleting properties on a circular map is not supported
            return FALSE;
        }
    }
}

root.map.__get__ = function (name)
{
    if (name === "length")
    {
        return map_length_get(this);     
    } else
    {
        return super(this).__get__(name);
    }
}

root.map.__lookup__ = function (name) 
{
    for (var i = 0; i < map_length_get(this); ++i)
    {
        if (name === map_property_name_get(this, i))
        {
            return map_property_location_get(this, i);    
        }
    }

    return undefined;
}

root.map.__new__ = function () 
{
    var new_map = this.__allocate__(
        default_object_value_nb,
        default_map_payload_size
    );

    object_map(new_map)   = object_map(this);
    object_proto(new_map) = this; 
    new_map.length = 0;

    return new_map;
}

root.map.__remove__ = function (name) 
{
    var new_map = super(this).__clone__(this.__payload_size__ - sizeof_property);
    new_map.length = this.length - 1;

    for (var i = 0; i < new_map.length; ++i)
    {
        if (map_property_name_get(this, i) !== name)
        {
            // Copy property
            map_property_name_set(new_map, i, 
                map_property_name_get(this, i));
            map_property_location_set(new_map, i, 
                map_property_location_get(this, i));
        } else
        {
            // The deleted property is not the last one,
            // move the last property in the deleted property
            // slot.
            map_property_name_set(new_map, i, 
                map_property_name_get(this, new_map.length));
            map_property_location_set(new_map, i, 
                map_property_location_get(this, i));
        }

    }

    return new_map;
}

root.map.__set__ = function (name, value) 
{
    if (name === "length")
        return map_length_set(this, value);

    if (name === "__map__") 
        return super(this).__set__(name, value);

    if (name === "__proto__")
        return super(this).__set__(name, value);

    var offset = this.__map__.__lookup__(name);

    if (offset === undefined)
    {
        if (map_values_are_immutable(this))
            return value;

        if (this.__map__.__map__ === this.__map__)
        {
            if (this.__map__ !== this)
            {
                // Add both on map's map and this
                var new_map = this.__map__.__create__(name);
                object_map(new_map) = new_map;

                object_values_count_inc(new_map);
                object_values_count_inc(this);

                object_value_set(new_map, -object_values_count_get(this), undefined);
                object_value_set(this,    -object_values_count_get(this), value);
            } else
            {
                var l = this.length;

                if (l === map_properties_size(this))
                {
                    // TODO
                    print("Map: not enough space left");
                    return false;
                }

                // Add property on map
                map_property_name_set(this, l, name);
                map_property_location_set(this, l, -l - 1);
                this.length = l + 1;

                // Add property in values
                object_values_count_inc(this);
                object_value_set(this, -this.length, value);
            }
            return value;
        } else
        {
            return super(this).__set__(name, value);
        }
    } else
    {
        return object_value_set(this, offset, value);    
    }
}


root.object.__clone__ = function (payload_size) 
{
    var clone = this.__allocate__(object_values_size_get(this), payload_size);    

    for (var i = 1; i <= object_values_size_get(this); ++i)
    {
        object_value_set(clone, -i, object_value_get(this, -i));
    }

    object_map(clone)   = object_map(this);
    object_proto(clone) = object_proto(this);

    return clone;
}

root.object.__delete__ = function (name) 
{
    var offset = object_map(this).__lookup__(name);

    if (offset === undefined)
    {
        return false;
    } else
    {
        var new_map      = object_map(this).__remove__(name);
        object_map(this) = new_map;
        
        // If the deleted property is not the last, move the value of the last
        // property in the deleted slot
        if (-offset < object_values_count_get(this))
        {
            object_value_set(this, offset, 
                object_value_get(this, -object_values_count_get(this)));
        }

        object_values_count_dec(this);
        
        return true;
    }
}

root.object.__get__ = function (name) 
{
    if (name === "__proto__")
        return object_proto(this);

    if (name === "__map__")
        return object_map(this);

    if (name === "__payload_size__")
        return object_payload_size(this);

    if (name === "__object__")
    {
        var offset = object_map(this).__lookup__(name);
        return (offset === undefined) ? 
                undefined : 
                object_value_get(this, offset);
    }


    var offset = undefined;

    // TODO: Ensure EVERY object has a __object__ property
    if (this.__object__ !== undefined)
    {
        var rcv = this.__object__;
    } else
    {
        var rcv = this; 
    }

    while (rcv !== null)
    {
        offset = object_map(rcv).__lookup__(name);

        if (offset !== undefined)
        {
            if (offset < 0)
                return object_value_get(rcv, offset);
            else
                return rcv.__extended__[offset];
        }
        
        rcv = object_proto(rcv);
    }

    return undefined;
}

root.object.__new__ = function () 
{
    var new_map         = object_map(this).__new__();
    var child           = this.__clone__(0);
    object_map(child)   = new_map;
    object_proto(child) = this;

    child.__object__    = child;
    child.__extended__  = null;
    return child;
}

root.object.__set__ = function (name, value) 
{
    if (this.__object__ === undefined && 
        name === "__object__")
    {
        var new_map      = object_map(this).__create__(name);
        object_map(this) = new_map;
        object_values_count_inc(this);
        return object_value_set(this, -object_values_count_get(this), value);
    }

    var obj = this.__object__;

    if (name === "__proto__")
        return object_proto(obj) = value;

    if (name === "__map__")
        return object_map(obj) = value;

    var offset = object_map(obj).__lookup__(name);

    if (offset === undefined)
    {
        if (object_values_count_get(obj) >= object_values_size_get(obj))
        {
            //print("object.__set__: extending object");

            if (obj.__extended__ === null)
            {
                obj.__extended__ = [];
            }


            var i = obj.__extended__.length;

            //print(i);
            //print(array_indexed_values_size_get(this.__extended__));

            obj.__extended__.__push__(value);

            var new_map      = object_map(obj).__create__(name);
            new_map.__set_prop_offset__(name, i);
            object_map(obj) = new_map;
            object_values_count_inc(obj);

            return value;
        } else
        {
            var new_map      = object_map(obj).__create__(name);
            object_map(obj) = new_map;
            object_values_count_inc(obj);
            return object_value_set(obj, -object_values_count_get(obj), value);
        }
    } else
    {
        if (offset < 0)
            return object_value_set(obj, offset, value);
        else 
            obj.__extended__[offset] = value;
    }
}
*/
