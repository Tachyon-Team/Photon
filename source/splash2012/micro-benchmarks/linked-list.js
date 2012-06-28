
function run(n)
{
    for (var i = 0; i < n; ++i)
    {
        var x = null;
        for (var j = 0; j < 10; ++j)
        {
            x = {next:x, value:1};
        }
    }
}

run(100);
var start = currentTimeMillis();
run(4000000);
print(currentTimeMillis() - start);
