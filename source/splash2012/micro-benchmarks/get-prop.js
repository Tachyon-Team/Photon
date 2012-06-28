
function run(n)
{
    var o = {foo:1};
    var r;
    for (var i = 0; i < n; ++i)
    {
        r = o.foo;
    }
}

run(100);
var start = currentTimeMillis();
run(500000000);
print(currentTimeMillis() - start);
