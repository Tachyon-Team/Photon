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
const default_map_payload_size     = 4*sizeof_property + sizeof_ref;
const map_length_offset            = 0;
const map_properties_offset        = 1;
const object_payload_size_offset   = -3;
const object_flags_offset          = -4;
const object_values_offset         = -4;

//--------------------------------- C Primitives -------------------------------

//@{["ref", photon.function]}@.__allocate__ = function (values_size, payload_size) {}
//@{["ref", photon.function]}@.__intern__   = function (code) {}

//@{["ref", photon.object]}@.__allocate__   = function (values_size, payload_size) {}
//@{["ref", photon.object]}@.__load__       = function (i, width) {}
//@{["ref", photon.object]}@.__store__      = function (i, value, width) {}

//@{["ref", photon.symbol]}@.__intern__     = function (string) {}
//@{["ref", photon.symbol]}@.__new__        = function (string) {}

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
    return ((object_payload_size(m) - sizeof_ref) / sizeof_property);
}
macro map_property_name_get(m,i)    
{
    // FIXME: Hard-coded constant until constant propagation is implanted
    return m[@i*4 + 1];
}
macro map_property_name_set(m,i,v)  
{
    // FIXME: Hard-coded constant until constant propagation is implanted
    return m[@i*4 + 1] = v;
}
macro map_property_location_get(m,i)  
{
    // FIXME: Hard-coded constant until constant propagation is implanted
    return m[@i*4 + 2];
}
macro map_property_location_set(m,i,v)
{
    // FIXME: Hard-coded constant until constant propagation is implanted
    return m[@i*4 + 2] = v;
}
macro map_values_are_immutable(m)   
{
    return (m[@object_flags_offset] & 0x10000) !== 0;
}
macro map_values_set_immutable(m)   
{
    return m[@object_flags_offset] |= 0x10000;
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
root.map.__object__                = root.map;

// TODO: Add __object__ property to existing non-root maps


//--------------------------------- Bootstrap ---------------------------------
(function () {
    var root_map           = root.object.__allocate__(20, 20*sizeof_property + 2*sizeof_ref);
    object_map(root_map)   = root_map;
    object_proto(root_map) = root.map;
    object_value_set(root_map, -1, root_map);
    object_values_count_inc(root_map);

    map_property_name_set(root_map, 0, "__map__");
    map_property_location_set(root_map, 0, 3);

    map_property_name_set(root_map, 1, "__proto__");
    map_property_location_set(root_map, 1, 2);

    map_property_name_set(root_map, 2, "__payload_size__");
    map_property_location_set(root_map, 2, 1);

    map_property_name_set(root_map, 3, "__flags__");
    map_property_location_set(root_map, 3, 0);

    map_property_name_set(root_map, 4, "__object__");
    map_property_location_set(root_map, 4, -1);

    map_property_name_set(root_map, 5, "__length__");
    map_property_location_set(root_map, 5, 5);

    map_property_name_set(root_map, 6, "__next_offset__");
    map_property_location_set(root_map, 6, 6);

    map_length_set(root_map, 7);
    map_next_offset_set(root_map, -2);

    function map_clone(map1, map2)
    {
        for (var i = 1; i <= object_values_count_get(map1); ++i)
        {
            object_value_set(map2, -i, object_value_get(map1, -i));
        }

        object_values_count_set(map2, object_values_count_get(map1));

        for(var i = 0; i < map_length_get(map2); ++i)
        {
            map_property_name_set(map2, i,
                    map_property_name_get(map1, i));
            map_property_location_set(map2, i,
                    map_property_location_get(map1, i));
        }
    }

    var map_map           = root.object.__allocate__(1, 7*sizeof_property + 2*sizeof_ref);
    map_length_set(map_map, 7);
    map_next_offset_set(map_map, -2);
    map_clone(root_map, map_map);
    map_values_set_immutable(map_map);

    object_map(map_map)   = map_map;
    object_proto(map_map) = root_map;
    object_value_set(map_map, -1, map_map);

    function map_set(map, name, value)
    {
        var i = map_length_get(map);    
        var offset = map_next_offset_get(map);

        map_property_name_set(map, i, name);
        map_property_location_set(map, i, offset);
        map_next_offset_set(map, offset - 1); 

        object_value_set(map, offset, value);
        object_values_count_inc(map);
    }

    map_set(root_map, "__lookup__", function (name)
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

    var map               = root.object.__allocate__(1, 5*sizeof_property + 2*sizeof_ref);
    map_length_set(map, 5);
    map_next_offset_set(map_map, -2);
    map_clone(map_map, map);

    object_map(map)   = map_map;
    object_proto(map) = root_map;
    object_value_set(map, -1, map);

    var object           = root.object.__allocate__(20, 0);
    object_map(object)   = map;
    object_proto(object) = root.object;
    object.__object__    = object;
    object_values_count_inc(object);

    print(object.__map__ === map);
    print(object.__proto__ === root.object);
    print(object.__payload_size__ === 0);
    print(object.__flags__);
    print(object.__object__ === object);

    object.foo = 42;
    object.bar = 24;

    object.__get2__ = function (name) 
    {
        var offset = undefined;
        var rcv = this;

        while (rcv !== null)
        {
            offset = object_map(rcv).__lookup__(name);

            if (offset !== undefined)
            {
                return object_value_get(rcv, offset);
            }
            
            rcv = object_proto(rcv);
        }

        return undefined;
    }

    print("Updated");
    print(object.__map__.__lookup__("__get2__"));
    //print(object.__get__("__map__"));
    /*
    print(object.__map__.__lookup__("foo"));
    print(object.__map__ === map);
    print(object.__proto__ === root.object);
    print(object.__payload_size__ === 0);
    print(object.__flags__);
    print(object.__object__ === object);
    */



    /*

    object_proto(object) = null;
    */
})();




//--------------------------------- Object Primitives -------------------------
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
