var fib = {
    fib:function (n)
    {
        if (n < 2) return n;
        return this.fib(n-1) + this.fib(n-2);
    }
};

//var n = Number(arguments[0]);
var n = 0;
//print("fib(" + n + "): " + fib.fib(n));
print("fib(0):");
print(fib.fib(n));


