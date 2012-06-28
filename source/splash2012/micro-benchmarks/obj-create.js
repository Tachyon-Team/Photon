
function run(n)
{
    var x = {};
    for (var i = 0; i < n; ++i)
    {
        Object.create(x);
    }
}

run(100);
var start = currentTimeMillis();
run(4000000);
print(currentTimeMillis() - start);
