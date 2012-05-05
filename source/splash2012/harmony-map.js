function Map() { 
    var that = this;
    that._keys = [];
    that._vals = [];

    return that;
}

(function () {
    function indexOf(keys, key) {
        var length = keys.length;
        for (var i = 0; i < length; ++i) 
            if (keys[i] === key) return i; 
        return -1;
    }

    Map.prototype.get = function (k) {
        var i = indexOf(this._keys, k);
        if (i >= 0) return this._vals[i];
        else return undefined;
    };

    Map.prototype.has = function (k) {
        return indexOf(this._keys, k) >= 0;
    };

    Map.prototype.set = function (k, v) {
        var i = indexOf(this._keys, k);
        if (i >= 0) return this._vals[i] = v;

        var keys = this._keys;
        var l    = keys.length;
        keys[l]  = k;
        this._vals[l] = v;
        return v;
    };

    Map.prototype.delete = function (k) {
        var i = indexOf(this._keys, k);
        if (i < 0) return false;

        var keys = this._keys;
        var last = keys.length-1;
        var vals = this._vals;

        if (i !== last) {
            keys[i] = keys[last];
            vals[i] = vals[last]; 
        }
        
        keys.length--;
        vals.length--;
        return true;
    };
})();
