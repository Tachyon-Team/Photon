
var a = [];
var b = 1;
for (var i = 0; i < 10000000; ++i)
{
    a[i] = i;
    //b = i;
}

function inner_loop(i)
{
    a[i] = 1 << 1;
    a[i] = 2 >> 1;
    a[i]--;
    a[i]++;
}

print(currentTimeMillis());
measurePerformance("loop", function ()
{
    for (var i = 0; i < 100000000; ++i)
    {
        a[i] = 1 << 1;
        a[i] = 2 >> 1;
        a[i]--;
        a[i]++;
    }
});
print(i-1);
print(b);
print(currentTimeMillis());

reportPerformance();
