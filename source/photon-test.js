photon.init();

photon.global = photon.send(photon.object, "new");

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

photon.bind = photon.send(photon.function, "new", 10);
var g = _compile(readFile("_bind.js"));
var _bind = photon.bind;
photon.bind = photon.send({g:g}, "g");

photon.send(_bind, "intern", 
            clean(_op("mov", _mref(photon.bind), _EAX).concat(_op("jmp", _EAX))));


/*
print(PhotonMacroExp.matchAll(
    [["begin",
        ["macro", "map_properties_size", ["m"], {}, ["begin", ["return", ["binop", "-", ["call", ["get", "foo"]], ["get", "sizeof_ref"]]]]], 
        ["macro", "foo", [], {}, ["begin", ["return", ["number", 42]]]], 
        ["call", ["get", "map_properties_size"], ["this"]]]], "trans"));
*/
var start = new Date().getTime();
var f = _compile(readFile("photon-objmodel.js"));
var end   = new Date().getTime();
print("compile time: " + ((end - start)) + " ms");
print(photon.send({f:f}, "f"));

/*
print(photon.send([1,2,3,42,26], "__get__", 3));
print(photon.send([1,2,3,42,26], "__get__", "length"));
print(photon.send([1,2,3,42,26], "__get__", -1));
print(photon.send([1,2,3,42,26], "__get__", 8));
*/

print(photon.send({foo:42}, "__get__", "foo"));
print(photon.send({foo:42}, "__get__", "bar"));
//print(photon.object);
//print(photon.send(photon.object, "get", "get").__addr__);
//print("Executing fib");


var start = new Date().getTime();
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
