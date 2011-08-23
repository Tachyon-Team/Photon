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

var start = new Date().getTime();
var f = _compile(readFile("fib.js"));
var end   = new Date().getTime();
print("compile time: " + ((end - start)) + " ms");
print(photon.send({f:f}, "f"));

//print(photon.object);
//print(photon.send(photon.object, "get", "get").__addr__);
//print("Executing fib");


var start = new Date().getTime();
//var f = photon.send(o, "fib", 40);
var r = photon.send({fib:photon.send(photon.global, "get", "fib")}, "fib", 40);
print(r);
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
