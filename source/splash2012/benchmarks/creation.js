function init()
{
    function Node(x, value)
    {
        this.next  = x;
        this.value = value;
    }

    var n = Number(this["arguments"][0]);
    var x = null;
    var o = {};

    // 20% slower
    for (var i = 0; i < n; ++i)
    {
        x = {};     
    }

    /* 
    // ~ 7x slower
    for (var i = 0; i < n; ++i)
    {
        x = Object.create(o);
    }

    // ~ 63x slower
    var m = n/10;
    for (var i = 0; i < m; ++i)
    {
        x = null;
        for (var j = 0; j < 10; ++j)
        {
            x = {next:x, value:1};
        }
    }

    // > 100x slower
    var m = n/10;
    for (var i = 0; i < m; ++i)
    {
        x = null;
        for (var j = 0; j < 10; ++j)
        {
            x = new Node(x, 1);
        }
    }

    // ~30x slower
    for (var i = 0; i < n; ++i)
    {
        x = []; 
    }

    // > 100x slower
    for (var i = 0; i < n; ++i)
    {
        x = [0,1,2,3,4,5,6,7,8,9,10];
    }
    */
}
