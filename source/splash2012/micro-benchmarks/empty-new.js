
function EmptyNode()
{
}

function run(n)
{
    for (var i = 0; i < n; ++i)
    {
        x = new EmptyNode();
    }
}

run(100);
var start = currentTimeMillis();
run(20000000);
print(currentTimeMillis() - start);
