function Map() { 
    return this;
}

(function () {
    function indexOf(m, key) {
        var length = m[@length_offset]*2;
        for (var i = first_entry_offset; i < length; i += 2)
            if (m[@i] === key) return i; 
        return -1;
    }
    function capacity(m) {
        return (m[@-3]/sizeof_ref - first_entry_offset)/entry_size;
    }
    function payload_size(capacity) {
        return (capacity*entry_size + first_entry_offset)*sizeof_ref;
    }
    function extend(m, cap) {
        var that   = m[@-5];
        var copy   = that.__clone__(payload_size(cap));
        var length = that[@-3] / sizeof_ref;

        for (var i = 0; i < length; ++i)
            copy[@i] = that[@i];

        m[@-5] = copy;
        return copy;
    }

    var length_offset      = 0;
    var first_entry_offset = length_offset + 1; 
    var init_nb      = 10;
    var entry_size   = 2;
    var sizeof_ref   = this.__ref_size__();
    var init_payload = payload_size(init_nb);

    Map.prototype = Map.prototype.__clone__(
        (first_entry_offset + entry_size)*sizeof_ref
    );
    Map.prototype[@0] = 0;

    Map.prototype.__new__ = function () {
        var that  = this.__init__(0, init_payload);
        that[@-1] = this.__base_map__;
        that[@-2] = this;
        that[@length_offset] = 0;
        return that;
    }

    Map.prototype.__new_default__ = Map.prototype.__new__;
    Map.prototype.__base_map__ = Map.prototype[@-1].__new__(); 

    Map.prototype.get = function (k) {
        var that = this[@-5];
        var i = indexOf(that, k);
        if (i >= 0) return that[@i+1];
        else return undefined;
    };

    Map.prototype.has = function (k) {
        return indexOf(this[@-5], k) >= 0;
    };

    Map.prototype.set = function (k, v) {
        var that = this[@-5];
        var i = indexOf(that, k);

        if (i >= 0) return that[@i+1] = v;

        var length = that[@length_offset];
        var cap    = capacity(that);

        if (length === cap) that = extend(this, 2*cap);

        var i = 2*length + first_entry_offset;
        that[@i]     = k;
        that[@i + 1] = v;
        that[@length_offset]++;            
        return v;
    };

    Map.prototype.delete = function (k) {
        var that = this[@-5];
        var i = indexOf(that, k);
        if (i < 0) return false;

        var length = that[@length_offset];
        var last = 2*(length-1)+first_entry_offset;

        if (i !== last) {
            that[@i]   = that[@last];
            that[@i+1] = that[@last + 1];
        }
                    
        that[@length_offset]--;
        return true;
    };
})();
