function fib(n)
{
    if (n < 2) return n;
    return this.fib(n-1) + this.fib(n-2);

    /*
    var j = 0;
    for (var i = 0; i < 10; ++i)
    {
        if (i > 5)
            break;

        j += 1;
    }

    return j;
    */
};
