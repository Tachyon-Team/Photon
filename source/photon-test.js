/*

Assumptions about the object model:
1. A type object is located at offset -1 from object reference
2. immediate integers at tagged with '1'
3. objects references are tagged with '0'
4. object new method takes no parameters
5. object set method takes 2 object parameters
5. array  new method takes 1 integer parameter
6. array  push method takes 1 object parameter 
7. function are called with the C calling convention

TODO:
1. Allow bind and super_bind to be redefined in C


*/

/*
print("Initializing C object model");
photon.init();

print("Creating global object");
photon.global = photon.send(photon.object, "__new__");

print("Creating bind function");
photon.bind = photon.send(photon.function, "__new__", 10, 0);
var _bind = photon.bind;
photon.bind = _compile(readFile("_bind.js")).functions["bind"];

photon.send(_bind, "__intern__", 
            clean(_op("mov", _mref(photon.bind), _EAX).concat(_op("jmp", _EAX))));

print("Creating super_bind function");
photon.super_bind = _compile(readFile("super_bind.js")).functions["super_bind"];

print("Installing standard library");
var f = _compile(readFile("photon-stdlib.js"));
print("Initializing standard library");
photon.send({f:f}, "f");
*/
photon.init();
photon.array.pp    = function () { return "photon.array"; };
photon.object.pp   = function () { return "photon.object"; };
photon.function.pp = function () { return "photon.function"; };
photon.global      = photon.send(photon.object, "__new__");
photon.global.pp   = function () { return "photon.global"; };
photon.cell.pp     = function () { return "photon.cell"; };
photon.map.pp      = function () { return "photon.map"; };
photon.symbol.pp   = function () { return "photon.symbol"; };
photon.fixnum.pp   = function () { return "photon.fixnum"; };

function _pp(s)
{
    print("Parsing");
    var ast = PhotonParser.matchAll(s, "topLevel");
    print("Macro Expansion");
    ast = PhotonMacroExp.match(ast, "trans");
    //print(ast);
    print("Desugaring");
    ast = PhotonDesugar.match(ast, "trans", undefined, function (m, idx, f) 
    { 
        print("Matched failed at index " + idx + " on input " + m.input.hd); 
        error(f);
    });
    print("Variable Analysis");
    PhotonVarAnalysis.match(ast, "trans");
    print("Variable Scope Binding");
    ast = PhotonVarScopeBinding.match(ast, "trans");
    print("Pretty Printing");
    print(ast);
    return PhotonPrettyPrinter.match(ast, "trans");
}

function _compile(s)
{
    function failer (m, idx, f) 
    { 
        print("Matched failed at index " + idx + " on input " + m.input.hd); 
        error(f);
    };

    print("Parsing");
    var ast = PhotonParser.matchAll(s, "topLevel", undefined, failer);
    //print(ast);
    print("Macro Expansion");
    ast = PhotonMacroExp.match(ast, "trans", undefined, failer);
    print("Desugaring");
    ast = PhotonDesugar.match(ast, "trans", undefined, failer);
    print("Variable Analysis");
    PhotonVarAnalysis.match(ast, "trans", undefined, failer);
    print("Variable Scope Binding");
    ast = PhotonVarScopeBinding.match(ast, "trans", undefined, failer);
    print("Pretty Printing");
    //print(ast);
    //print(PhotonPrettyPrinter.match(ast, "trans"));

    print("Code Generation");
    var comp = PhotonCompiler.createInstance();
    code = comp.match(ast, "trans", undefined, failer);
    //print("Code: '" + code.length + "'");
    var f = comp.context.new_function_object(code, comp.context.refs, 0);
    f.functions = comp.context.functions;

    return f; 
}

print("Creating bind function");
photon.bind = photon.send(photon.function, "__new__", 10, 0);
var _bind = photon.bind;
photon.bind = _compile(readFile("_bind.js")).functions["bind"];
photon.send(_bind, "__intern__", 
            clean(_op("mov", _mref(photon.bind), _EAX).concat(_op("jmp", _EAX))));

print("Creating super_bind function");
photon.super_bind = _compile(readFile("super_bind.js")).functions["super_bind"];

print("Installing standard library");
var f = _compile(readFile("photon-stdlib.js"));
print("Initializing standard library");
photon.send({f:f}, "f");


print("test4");
var g = _compile(readFile("test4.js"));
print(photon.send({g:g}, "g"));

try
{
print("Bootstrapping JS object model");
var start = new Date().getTime();
var f = _compile(readFile("photon-objmodel.js"));
var end   = new Date().getTime();
print("compile time: " + ((end - start)) + " ms");
var r = photon.send({f:f}, "f");
} catch (e)
{
    print(e.stack);
    throw e;
}

/*
print("Retrieving new objects");
var new_root = {};
new_root.array    = photon.send(r, "__get__", "array");
new_root.function = photon.send(r, "__get__", "function");
new_root.map      = photon.send(r, "__get__", "map");
new_root.object   = photon.send(r, "__get__", "object");
new_root.symbol   = photon.send(r, "__get__", "symbol");

print("Adding conversion functions to objects");
var start = new Date().getTime();
var f = _compile(readFile("photon-convert.js"));
var end   = new Date().getTime();
print("compile time: " + ((end - start)) + " ms");
var r = photon.send({f:f}, "f");
 
print("Removing dependencies to old object model");
print("Recreating bind function");
photon.bind = photon.send(photon.function, "__new__", 10, 0);
var g = _compile(readFile("_bind.js"));
var _bind = photon.bind;
photon.bind = photon.send({g:g}, "g");

print("Number of references in g compiled code");
print(photon.send(g, "__load_ref__", 0).__addr__);
print(photon.bind.__addr__);

photon.send(_bind, "__intern__", 
            clean(_op("mov", _mref(photon.bind), _EAX).concat(_op("jmp", _EAX))));

print("Recreating super_bind function");
photon.super_bind = photon.send({f:_compile(readFile("super_bind.js"))}, "f");
*/

print("Bootstrap done");

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
var f = photon.send(photon.function, "__new__", 10, 0);
photon.send(f, "__intern__", clean(flatten([_op("mov", _$(_ref(42)), _EAX), _op("ret")])));
assert(photon.send({f:f}, "f") === 42);

//print("Map tests");
var m = photon.send(o, "__get__", "__map__");

// Tests requiring extensions from C object model
/*
assert(photon.send([1,2,3,42,26], "__get__", "length") === 5);
var c = photon.send({foo:42}, "__clone__", 0);
var m = photon.send(c, "__get__", "__map__");
assert(photon.send(m, "__lookup__", "foo") !== undefined);
assert(photon.send(m, "__lookup__", "bar") === undefined);
*/

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


print("Compiling test");
var f = _compile(readFile("test.js"));
print("Executing test");
photon.send({f:f}, "f");
