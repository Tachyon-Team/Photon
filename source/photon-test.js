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

/*
print(PhotonMacroExp.matchAll(
    [["begin",
        ["macro", "object_map", ["o"], {}, ["begin", ["return", ["get", "o"]]]], 
        ["set", ["call", ["get", "object_map"], ["this"]], ["number", 42]]]], "trans"));
*/

print("Creating bind function");
photon.bind = photon.send(photon.function, "__new__", 10);
var g = _compile(readFile("_bind.js"));
var _bind = photon.bind;
photon.bind = photon.send({g:g}, "g");

photon.send(_bind, "__intern__", 
            clean(_op("mov", _mref(photon.bind), _EAX).concat(_op("jmp", _EAX))));

print("Creating super_bind function");
photon.super_bind = photon.send({f:_compile(readFile("super_bind.js"))}, "f");

print("Installing standard library");
var f = _compile(readFile("photon-stdlib.js"));
photon.send({f:f}, "f");

print("Bootstrapping JS object model");
var start = new Date().getTime();
var f = _compile(readFile("photon-objmodel.js"));
var end   = new Date().getTime();
print("compile time: " + ((end - start)) + " ms");
photon.send({f:f}, "f");

var start = new Date().getTime();

try {

print("Testing JS object model");
//print("Array tests");
assert(photon.send([1,2,3,42,26], "__get__", 3) === 42);
assert(photon.send([1,2,3,42,26], "__get__", -1) === undefined);
assert(photon.send([1,2,3,42,26], "__get__", 8)  === undefined);
var a = photon.send([], "__new__", 10);
photon.send(a, "__push__", 1);
assert(photon.send(a, "__get__", 0) === 1);
var a = photon.send([], "__new__", 10);
photon.send(a, "__set__", 0, 24);
photon.send(a, "__set__", "foo", 42);
photon.send(a, "__set__", -1, 32);
assert(photon.send(a, "__get__", "foo") === 42);
assert(photon.send(a, "__get__", 0) === 24);
assert(photon.send(a, "__get__", -1) === 32);

//print("Object tests");
var o = photon.send(photon.object, "__new__");
photon.send(o, "__set__", "foo", 42);
assert(photon.send(o, "__get__", "foo") === 42);
assert(photon.send(o, "__get__", "bar") === undefined);

assert(photon.send({foo:42}, "__get__", "foo") === 42);

var c = photon.send({foo:42}, "__clone__", 0);
assert(photon.send(c, "__get__", "foo") === 42);
assert(photon.send(c, "__get__", "bar") === undefined);

var o = photon.send(photon.object, "__new__");
photon.send(o, "__set__", "foo", 42);
photon.send(o, "__delete__", "foo");
assert(photon.send(o, "__get__", "foo") === undefined);
photon.send(o, "__set__", "foo", 42);
photon.send(o, "__set__", "bar", 24);
assert(photon.send(o, "__get__", "bar") === 24);
photon.send(o, "__delete__", "bar");
assert(photon.send(o, "__get__", "bar") === undefined);
photon.send(o, "__set__", "bar", 24);
photon.send(o, "__delete__", "foo");
assert(photon.send(o, "__get__", "bar") === 24);
assert(photon.send(o, "__get__", "foo") === undefined);

//print("Function tests");
var f = photon.send(photon.function, "__new__", 10);
photon.send(f, "__intern__", clean(flatten([_op("mov", _$(_ref(42)), _EAX), _op("ret")])));
assert(photon.send({f:f}, "f") === 42);

//print("Map tests");
var m = photon.send(o, "__get__", "__map__");

// Tests requiring extensions from C object model
assert(photon.send([1,2,3,42,26], "__get__", "length") === 5);
var c = photon.send({foo:42}, "__clone__", 0);
var m = photon.send(c, "__get__", "__map__");
assert(photon.send(m, "__lookup__", "foo") !== undefined);
assert(photon.send(m, "__lookup__", "bar") === undefined);

print("Tests passed");

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

var end   = new Date().getTime();
print("execution time: " + ((end - start)) + " ms");


print("Compiling Fib");
var start = new Date().getTime();
var f = _compile(readFile("fib.js"));
var end   = new Date().getTime();
print("compile time: " + ((end - start)) + " ms");
photon.send({f:f}, "f");


print("Executing Fib");
var start = new Date().getTime();
var r = photon.send({fib:photon.send(photon.global, "__get__", "fib")}, "fib", 10);
var end   = new Date().getTime();
print(r);
print("execution time: " + ((end - start)) + " ms");

