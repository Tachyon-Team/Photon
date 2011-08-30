photon.init();

photon.global = photon.send(photon.object, "__new__");

/*
_ast_frequency([
   //"utility/debug.js",
   //"utility/num.js",
   //"utility/misc.js",
   //"utility/iterators.js",
   //"utility/arrays.js",
   //"stdlib/array.js",
   //"stdlib/string.js",
   //"stdlib/function.js",
   //"stdlib/object.js",
   //"backend/asm.js",
   //"backend/x86/asm.js",
   "ometa-js/lib.js", 
   "ometa-js/ometa-base.js", 
   "ometa-js/parser.js", 
   "ometa-js/photon-compiler.js",
   //"photon-lib.js",
   "photon-test.js"
].map(readFile).join("\n"));
*/

//_compile(readFile("test.js"));
//_ast_frequency(readFile("ometa-js/photon-compiler.js"));
//_ast_frequency(readFile("test.js"));
//_ast_frequency(readFile("photon-lib2.js"));
//_ast_frequency(readFile("backend/x86/asm.js"));

print("Creating bind function");
photon.bind = photon.send(photon.function, "__new__", 10);
var g = _compile(readFile("_bind.js"));
var _bind = photon.bind;
photon.bind = photon.send({g:g}, "g");

photon.send(_bind, "__intern__", 
            clean(_op("mov", _mref(photon.bind), _EAX).concat(_op("jmp", _EAX))));

print("Creating super_bind function");
photon.super_bind = photon.send({f:_compile(readFile("super_bind.js"))}, "f");


/*
print(PhotonMacroExp.matchAll(
    [["begin",
        ["macro", "object_map", ["o"], {}, ["begin", ["return", ["get", "o"]]]], 
        ["set", ["call", ["get", "object_map"], ["this"]], ["number", 42]]]], "trans"));
*/
var start = new Date().getTime();
var f = _compile(readFile("photon-objmodel.js"));
var end   = new Date().getTime();
print("compile time: " + ((end - start)) + " ms");
photon.send({f:f}, "f");

var start = new Date().getTime();

try {

assert(photon.send([1,2,3,42,26], "__get__", 3) === 42);
assert(photon.send([1,2,3,42,26], "__get__", "length") === 5);
assert(photon.send([1,2,3,42,26], "__get__", -1) === undefined);
assert(photon.send([1,2,3,42,26], "__get__", 8)  === undefined);

var a = photon.send([], "__new__", 10);
photon.send(a, "__set__", "foo", 42);
photon.send(a, "__set__", 0, 24);
photon.send(a, "__set__", -1, 32);
assert(photon.send(a, "__get__", "foo") === 42);
assert(photon.send(a, "__get__", 0) === 24);
assert(photon.send(a, "__get__", -1) === 32);
photon.send(a, "__delete__", "foo");
assert(photon.send(a, "__get__", "foo") === undefined);

var a = photon.send([], "__new__", 10);
photon.send(a, "__push__", 1);
assert(photon.send(a, "__get__", 0) === 1);


var o = photon.send(photon.object, "__new__");
photon.send(o, "__set__", "foo", 42);
assert(photon.send(o, "__get__", "foo") === 42);
assert(photon.send(o, "__get__", "bar") === undefined);

assert(photon.send({foo:42}, "__get__", "foo") === 42);

var c = photon.send({foo:42}, "__clone2__", 0);
assert(photon.send(c, "__get__", "foo") === 42);



} catch (e)
{
    if (e.stack)
    {
        print(e.stack);
    } else
    {
        print(e);
    }
}


//var f = photon.send(o, "fib", 40);
//var r = photon.send({fib:photon.send(photon.global, "get", "fib")}, "fib", 40);
//print(r);
/*
print(photon.send(f, "get", "a"));
print(photon.send(f, "set", "a", 42));
print(photon.send(f, "get", "a", 42));
print(photon.send({f:f}, "f", f));
*/
//print(photon.send(o, "fib", 10));
var end   = new Date().getTime();
print("execution time: " + ((end - start)) + " ms");

/*
print(photon.map.__addr__);
print(photon.object.__addr__);
print(photon.send({f:photon.bind}, "f", "get", photon.map).__addr__);
*/
