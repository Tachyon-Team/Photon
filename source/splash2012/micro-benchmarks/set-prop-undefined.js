
function run(n)
{
    var o = {foo:1};
    for (var i = 0; i < n; ++i)
    {
        o.bar = i;
    }
}

run(100);
var start = currentTimeMillis();
run(250000000);
print(currentTimeMillis() - start);
