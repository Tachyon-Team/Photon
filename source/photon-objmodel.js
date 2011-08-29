var root = {
    array:      @{["ref", photon.array]}@,
    "function": @{["ref", photon.function]}@,
    map:        @{["ref", photon.map]}@,
    object:     @{["ref", photon.object]}@,
    symbol:     @{["ref", photon.symbol]}@
};

// Constants
const sizeof_ref                   = 4;
const sizeof_header                = 4*sizeof_ref;
const sizeof_property              = 2*sizeof_ref; 

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
macro array_indexed_values_size_get(a)  
{
    return a[@0];
}
macro array_indexed_values_size_set(a, v)
{
    return a[@0] = v;
}
macro map_length_get(m)
{
    return m[@map_length_offset];
}
macro map_length_set(m, v)
{
    return m[@map_length_offset] = v;
}
macro map_properties_size(m)        
{
    return (object_payload_size_get(m) - sizeof_ref) / sizeof_property;
}
macro map_property_name_get(m,i)    
{
    return m[@i*2 + map_properties_offset];
}
macro map_property_name_set(m,i,v)  
{
    return m[@i*2 + map_properties_offset] = v;
}
macro map_property_location_get(m,i)  
{
    return m[@i*2 + 1 + map_properties_offset];
}
macro map_property_location_set(m,i,v)
{
    return m[@i*2 + 1 + map_properties_offset] = v;
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
macro object_payload_size_get(o)    
{
    return o[@object_payload_size_offset];
}
macro object_proto(o)
{
    return o[@-2];
}
macro object_value_get(o, i)
{
    return o[@object_values_offset + i];
}
macro object_value_set(o, i, v)
{
    return o[@object_values_offset + i] = v;
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
    return (o[@object_flags_offset] & 0xFF00) >> 0;
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
            [_op("mov", _EAX, _EBX),
             _op("and", _$(1), _EBX),
             _op("mov", _$(_TRUE), _EAX),
             _op("mov", _$(_FALSE), _EBX),
             _op("cmovz", _EBX, _EAX)]]
    ]}@;
}

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
        //return super(this).__delete__(name);
    }
}

root.array.__get__ = function (name) 
{   
    if (ref_is_fixnum(name))
    {
        if (name < 0)
        {
            return undefined; //super(this).__get__(name)
        } else if (name >= this.__get__("length"))
        {
            return undefined;
        } else
        {
            return array_indexed_value_get(this, name);
        }
    } else if (name === "length")
    {
        return array_indexed_values_size_get(this);
    } else     
    {
        return undefined; //super(this).__get__(name);
    }
}

/*
root.array.__new__ = function (size) 
{
    var new_array = this.__allocate__(4, (size + 1) * sizeof_ref); 
    new_array.__map__   = this.__map__.__new__();     
    new_array.__proto__ = this;

    return new_array;
}

root.array.__push__ = function (value) 
{
    return this.__set__(this.length, value);
}

root.array.__set__ = function (name, value) 
{
    if (ref_is_fixnum(name) && name >= 0)
    {
        if (name >= this.length)
        {
            if (name >= array_indexed_values_size_get(this))
            {
                // TODO
            }

            this.length = name + 1;
        }

        array_indexed_value_set(this, name, value);
    } else if (name === "length" && ref_is_fixnum(value))
    {
        if (value > this.length)
        {
            if (value >= array_indexed_values_size_get(this))
            {
                // TODO
            }

            for (var i = this.length; i < value; ++i)
            {
                array_indexed_value_set(this, i, undefined);
            }
        }

        this.length = value;
    } else
    {
        return super(this).__set__(name, value);
    }

    return value;
}

root.function.__intern__ = function (code) 
{
    for (var i = 0; i < code.length; ++i)
    {
        this.__store__(i, code[i] & 255, 8);
    }

    return this;
}

root.function.__new__ = function (size) 
{
    var new_fct = this.__allocate__(default_object_value_nb, size);
    new_fct.__map__   = this.__map__.__new__();
    new_fct.__proto__ = this;
}

root.map.__clone__ = function (payload_size) 
{
    assert(payload_size >= sizeof_ref);

    var new_map    = super(this).__clone__(payload_size);
    new_map.length = (payload_size - sizeof_ref) / (sizeof_property);

    for (var i = 0; i < new_map.length; ++i)
    {
        map_property_name_set(new_map, i, map_property_name_get(this, i));
        map_property_location_set(new_map, i, map_property_location_get(this, i));
    }

    if (map_values_are_immutable(this))
    {
        map_values_set_immutable(new_map);
    }

    return new_map;
}

root.map.__create__ = function (name) 
{
    if (this.length === map_properties_size(this))
    {
        var payload_size = this.__payload_size__ + sizeof_property; 
    } else
    {
        var payload_size = this.__payload_size;
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
        super(this).__get__(name);
    }
}


root.map.__lookup__ = function (name) 
{
    for (var i = 0; i < this.length; ++i)
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

    new_map.__map__   = this.__map__;
    new_map.__proto__ = this; 
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
                map_property_name_get(this, new_map.length + 1));
            map_property_location_set(new_map, i, 
                map_property_location_get(this, i));
        }

    }

    return new_map;
}

root.map.__set__ = function (name, value) 
{
    if (name === "length")
    {
        return map_length_set(this, value);
    }

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
                new_map.__map__ = new_map;

                object_values_count_inc(new_map);
                object_values_count_inc(this);

                object_value_set(new_map, -object_values_count_get(this), undefined);
                object_value_set(this,    -object_values_count_get(this), value);
            } else
            {
                if (this.length === map_properties_size(this))
                {
                    // TODO
                }

                // Add property on map
                map_property_name_set(this, this.length, name);
                map_property_location_set(this, this.length, -this.length - 1);
                this.length += 1;

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

    clone.__map__   = this.__map__;
    clone.__proto__ = this.__proto__;

    return clone;
}

root.object.__delete__ = function (name) 
{
    var offset = this.__map__.__lookup__(name);

    if (offset === undefined)
    {
        return false;
    } else
    {
        var new_map = this.__map__.__remove__(name);
        this.__map__ = new_map;
        
        // If the deleted property is not the last, move the value of the last
        // property in the deleted slot
        if (-offset < object_values_size_get(this))
        {
            object_value_set(this, offset, 
                object_value_get(this, -object_values_size_get(this)));
        }

        object_values_count_dec(this);
        
        return true;
    }
}
*/

root.object.__get__ = function (name) 
{
    var offset = undefined;
    var rcv  = this;

    while (rcv !== null)
    {
        offset = object_map(rcv).lookup(name);

        if (offset !== undefined)
        {
            return object_value_get(rcv, offset);
        }
        
        rcv = object_proto(rcv);
    }

    return undefined;
}
/*
root.object.__new__ = function () 
{
    var new_map     = this.__map__.__new__();
    var child       = this.__clone__();
    child.__map__   = new_map;
    child.__proto__ = this;

    return child;
}

root.object.__set__ = function (name, value) 
{
    var offset = this.__map__.__lookup__(name);

    if (offset === undefined)
    {
        if (object_values_count_get(this) === object_values_size_get(this))
        {
            // TODO
        } else
        {
            var new_map = this.__map__.__create__(name);
            this.__map__ = new_map;
            object_values_count_inc(this);
            return object_value_set(this, -object_values_count_get(this), value);
        }
    } else
    {
        return object_value_set(this, offset, value);
    }
}
*/