function init()
{
    function Node(x, value)
    {
        this.next  = x;
        //this.value = value;
    }

    function EmptyNode()
    {

    }

    var n = Number(this["arguments"][0]);
    var x = null;
    var o = {};

    /* 
    // 1.8x slower  GC prop: 50% 
    for (var i = 0; i < n; ++i)
    {
        x = {};     
    }

    // Before: ~10.5x slower GC prop: N/A (object.__new__ should use GC!!!)
    for (var i = 0; i < n; ++i)
    {
        x = Object.create(o);
    }

    */
    /*
    // Before: ~63x slower After: 4.41x slower GC prop: 20%
    var m = n/10;
    for (var i = 0; i < m; ++i)
    {
        x = null;
        for (var j = 0; j < 10; ++j)
        {
            x = {next:x, value:1};
        }
    }

    // Before: ~6.33x slower
    var obj = {next:x, value:1};
    for (var i = 0; i < n; ++i)
    {
        obj.next  = i;
        obj.value = i; 
    }
    */

    // Before: > 100x slower After: 
    var m = n/10;
    for (var i = 0; i < m; ++i)
    {
        x = null;
        for (var j = 0; j < 10; ++j)
        {
            x = new Node(x, 1);
        }
    }

    /*
    // Before: ~56x slower After: ~4x slower (but incorrect behavior when returning litteral strings from constructor) GC prop: 25%
    var m = n/10;
    for (var i = 0; i < m; ++i)
    {
        x = null;
        for (var j = 0; j < 10; ++j)
        {
            x = new EmptyNode();
        }
    }

    // Before: ~30x slower After: ~3x slower
    for (var i = 0; i < n; ++i)
    {
        x = []; 
    }

    // > 100x slower after: ~14x slower
    for (var i = 0; i < n; ++i)
    {
        x = [0,1,2,3,4,5,6,7,8,9,10];
    }

    // Before: ~ 17x slower After: ~2.15x slower
    for (var i = 0; i < n; ++i)
    {
        x = [[0],[1]];
    }
    */
}
