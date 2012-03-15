print("entering fib");
function fib(n)
{
    if (n < 2) return n;
    return fib(n-1) + fib(n-2);
}

var n = Number(arguments[0]);
//var n = 0;
print("fib(" + n + "):");
print(fib(n));

