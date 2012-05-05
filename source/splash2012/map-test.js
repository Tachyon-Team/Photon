var start = currentTimeMillis();
var n = 2000;
var m = new Map();

print("Map set");
for (var i = 0; i < n; ++i)
{
    m.set(i,i);
}

print("Map has");
for (var i = 0; i < n; ++i)
{
    m.has(i);
}

print("Map get");
for (var i = 0; i < n; ++i)
{
    m.get(i);
}

print("Map delete");
for (var i = 0; i < n; ++i)
{
    m.delete(i);
}

for (var i = 0; i < 10; ++i)
{
    m[i] = i;
}
print("Running time (ms):");
print(currentTimeMillis());
