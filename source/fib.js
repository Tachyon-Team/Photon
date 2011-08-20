global_return function (n)
{
    /*
    if (n < 2) return n;
    return this.fib(n-1) + this.fib(n-2);
    //n.foo = 24;
    function test(s)
    {
        s.foo = 24;
        return s.foo;
    }
    */

    /*
    var o = {
        foo:function (a) { break; }
    };
    */
    var o = {};
    var f = {};

    @{["ref", photon.object]}@.instanceof = function (o)
    {
        return false;
    }

    var i = 0;
    i++

    return i;
};
