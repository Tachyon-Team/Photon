
function run(n)
{
    for (var i = 0; i < n; ++i)
    {
        x = {foo:1, bar:{baz:2}};     
    }
}

run(100);
var start = currentTimeMillis();
run(4000000);
print(currentTimeMillis() - start);
