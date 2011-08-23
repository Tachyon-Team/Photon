const sizeof_ref      = 4;
const sizeof_property = 8; 
const sizeof_header   = 16;

//--------------------------------- Macros -------------------------------------
macro array_indexed_values_size(a)  {}
macro fixnum_to_ref(i)              {}
macro fx(r)                         {}
macro map_properties_count(m)       {}
macro map_properties_size(m)        {}
macro map_values_count(m)           {}
macro map_values_set_immutable(m)   {}
macro object_values_count_dec(o)    {}
macro object_values_count_inc(o)    {}
macro object_values_count_set(o, c) {}
macro object_values_size(o)         {}
macro object_values_size_set(o, s)  {}
macro ref(i)                        {}
macro ref_is_fixnum(r)              {}
macro ref_is_object(r)              {}
macro ref_to_fixnum(r)              {}
macro super(r)                      {}

//--------------------------------- Object Primitives -------------------------
@{["ref", photon.array]}@.__delete__ = function (name) 
{
    if (ref_is_fixnum(name))
    {
        print("Deleting numeric properties on arrays not supported\n");
        exit(1);
    } else if (name === "length")
    {
        return false;
    } else
    {
        return delete super(this)[name];
    }
}

@{["ref", photon.array]}@.__get__    = function (name) 
{
    if (ref_is_fixnum(name) && name >= 0)
    {
        if (i > this.length)
        {
            return undefined;
        } else
        {
            return this[@i + 1];
        }
    }

    return super(this).__get__(name);
}

@{["ref", photon.array]}@.__new__    = function (size) 
{
    var new_array = this.__allocate__(4, (size + 1) * sizeof_ref); 
    new_array.__map__   = this.__map__.__new__();     
    new_array.__proto__ = this;

    return new_array;
}

@{["ref", photon.array]}@.__push__   = function (value) 
{
    return this.__set__(this.length, value);
}

@{["ref", photon.array]}@.__set__    = function (name, value) 
{
    if (ref_is_fixnum(name) && name >= 0)
    {
        if (name >= this.length)
        {
            this.length += 1;
        }

        this[@name + 1] = value;
    } else if (name === length && ref_is_fixnum(value))
    {
        if (value > this.length)
        {
            for (var i = this.length; i < value; ++i)
            {
                this[@i+1] = undefined;
            }
        }

        this[@0] = value;
    } else
    {
        return super(this).__set__(name, value);
    }

    return value;
}

//@{["ref", photon.function]}@.__allocate__ = function (values_size, payload_size) {}

@{["ref", photon.function]}@.__intern__   = function (code) 
{
    for (var i = 0; i < code.length; ++i)
    {
        this.__store__(i, code[i] & 255);
    }

    return this;
}

@{["ref", photon.function]}@.__new__      = function (size) 
{
    var new_fct = this.__allocate__(4, size);
    new_fct.__map__   = this.__map__.__new__();
    new_fct.__proto__ = this;
}

@{["ref", photon.map]}@.__clone__  = function (payload_size) 
{
    var new_map    = super(this).__clone__(payload_size);
    new_map.length = this.length;

    for (var i = 0; i < this.length; ++i)
    {
        new_map[@i+1] = this[@i + 1];
    }

    if (map_values_are_immutable(this))
    {
        map_values_set_immutable(new_map);
    }

    return new_map;
}

@{["ref", photon.map]}@.__create__ = function (name) 
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
    new_map[@this.length * 2]     = name;
    new_map[@this.length * 2 + 1] = -new_map.length;

    return new_map;
}

@{["ref", photon.map]}@.__delete__ = function (name) 
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

            var size = object_values_size(this);

            if (-offset < size)
            {
                this[@offset * 2 - sizeof_header]    = this[@-size * 2 - sizeof_header];
                new_map[@offset * 2 - sizeof_header] = new_map[@-size * 2 - sizeof_header]; 
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
@{["ref", photon.map]}@.__lookup__ = function (name) 
{
    for (var i = 0; i < this.length; ++i)
    {
        if (name === this[@i*2 + 1])
        {
            return this[@i*2 + 2];    
        }
    }

    return undefined;
}
@{["ref", photon.map]}@.__new__    = function () 
{
    var new_map = this.__allocate__(4, 4*sizeof_property + sizeof_ref);

    new_map.__map__   = this.__map__;
    new_map.__proto__ = this; 
    new_map.length = 0;

    return new_map;
}
@{["ref", photon.map]}@.__remove__ = function (name) 
{
    var new_map = super(this).__clone__(this.__payload_size__ - sizeof_property);
    new_map.length = this.length - 1;

    for (var i = 0; i < new_map.length; ++i)
    {
        if (this[@i*2 + 1] !== name)
        {
            // Copy property
            new_map[@i*2 + 1] = this[@i*2 + 1];
            new_map[@i*2 + 2] = this[@i*2 + 2];
        } else
        {
            // The deleted property is not the last one,
            // move the last property in the deleted property
            // slot.
            new_map[@i*2 + 1]   = this[@(new_map.length + 1)*2 + 1];
            new_map[@i*2 + 2]   = this[@i*2 + 2];
        }

    }

    return new_map;
}
@{["ref", photon.map]}@.__set__    = function (name, value) {}

@{["ref", photon.object]}@.__allocate__ = function (values_size, payload_size) {}
@{["ref", photon.object]}@.__clone__    = function (payload_size) {}
@{["ref", photon.object]}@.__create__   = function (name) {}
@{["ref", photon.object]}@.__delete__   = function (name) {}
@{["ref", photon.object]}@.__get__      = function (name) {}
@{["ref", photon.object]}@.__load__     = function (i, width) {}
@{["ref", photon.object]}@.__lookup__   = function (name) {}
@{["ref", photon.object]}@.__new__      = function () {}
@{["ref", photon.object]}@.__set__      = function (name, value) {}
@{["ref", photon.object]}@.__store__    = function (i, value, width) {}

@{["ref", photon.symbol]}@.__intern__   = function (string) {}
@{["ref", photon.symbol]}@.__new__      = function (string) {}
