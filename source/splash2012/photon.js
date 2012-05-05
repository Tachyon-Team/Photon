// Used by v8 to create mirrors to photon objects
function mirror_addr_bytes()
{
    if (this.__addr__ !== undefined)
        return this.__addr__;

    throw "Invalid mirror";
}

photon.init();
photon.array.pp    = function () { return "photon.array"; };
photon.object.pp   = function () { return "photon.object"; };
photon.function.pp = function () { return "photon.function"; };
photon.global.pp   = function () { return "photon.global"; };
photon.cell.pp     = function () { return "photon.cell"; };
photon.map.pp      = function () { return "photon.map"; };
photon.symbol.pp   = function () { return "photon.symbol"; };
photon.fixnum.pp   = function () { return "photon.fixnum"; };

var options = {"inline_cache":true, "verbose":false, "report":false};
var cmdline_options = {"-noic":true, "-v":true, "-report":true};

for (var i = 0; i < arguments.length; ++i)
{
    var option = arguments[i];

    if (options === "-noic")
    {
        options["inline_cache"] = false;
    } else if (options === "-v")
    {
        options["verbose"] = true;
    } else if (option === "-report")
    {
        options["report"] = true;
    }
}

create_handlers();

function _compile(s, print)
{
    if (print === undefined)
    {
        print = function () {};
    }

    function failer (m, idx, f) 
    { 
        print("Matched failed at index " + idx + " on input " + m.input.hd); 
        error(f);
    };

    var ast;
    return measurePerformance("Compile", function () {
        measurePerformance("Parsing", function ()
        {
            print("Parsing");
            ast = PhotonParser.matchAll(s, "topLevel", undefined, failer);
        });
        //print(ast);
        measurePerformance("Macro Expansion", function ()
        {
            print("Macro Expansion");
            ast = PhotonMacroExp.match(ast, "trans", undefined, failer);
        });
        measurePerformance("Desugaring", function ()
        {
            print("Desugaring");
            ast = PhotonDesugar.match(ast, "trans", undefined, failer);
        });

        //print(PhotonPrettyPrinter.match(ast, "trans"));
        //print(ast);

        measurePerformance("Variable Analysis", function ()
        {
            print("Variable Analysis");
            PhotonVarAnalysis.match(ast, "trans", undefined, failer);
        });
        measurePerformance("Variable Scope Binding", function ()
        {
            print("Variable Scope Binding");
            ast = PhotonVarScopeBinding.match(ast, "trans", undefined, failer);
        });
        measurePerformance("Optimizing", function ()
        {
            print("Optimizing");
            ast = PhotonOptimizer.match(ast, "trans", undefined, failer);
        });
        //print("Pretty Printing");
        //print(ast);
        print(PhotonPrettyPrinter.match(ast, "trans"));


        var comp, code, f;
        measurePerformance("Code Generation", function ()
        {
            print("Code Generation");
            comp = PhotonCompiler.createInstance();
            code = comp.match(ast, "trans", undefined, failer);
            //print("Code: '" + code.length + "'");
            f = comp.context.new_function_object(code, comp.context.refs, 0, print);
            f.functions = comp.context.functions;
        });

        return f; 
    });
}


function log(s)
{
    if (options["verbose"]) 
        print(s);
}

photon.handlers = {};

try
{

log("Creating bind function");
photon.bind = photon.send(photon.function, "__new__", 15, 0);
var _bind = photon.bind;
photon.bind = _compile(readFile("../_bind.js")).functions["bind"];
photon.send(_bind, "__intern__", 
            clean(flatten([
                _op("mov", _mref(photon.bind), _EAX),
                _op("jmp", _EAX),
                0x3,
                0x0,
                0x0,
                0x0,
                0x3,
                0x0,
                0x0,
                0x0
           ])));

log("Creating handlers");
photon.handlers = _compile(readFile("../handlers.js")).functions;

log("Creating super_bind function");
photon.super_bind = _compile(readFile("../super_bind.js")).functions["super_bind"];

if (options["inline_cache"])
{
    log("Creating inline cache bind function");
    photon.inline_bind = _compile(readFile("../inline_bind.js")).functions["inline_bind"];
}

} catch (e)
{
    print(e.stack);
    throw e;
}

log("Adding handlers in client environment");
photon.send( photon.global, "__set__", "_handlers", photon.handlers);

log("Installing standard library");
var f = _compile(readFile("../photon-stdlib.js"), arguments[1] === "-v" ? print : undefined);
log("Initializing standard library");
photon.send({f:f}, "f");


function init_client(s)
{
    if (cmdline_options.hasOwnProperty(s))
        return;

    perfBuckets = {};
    try
    {
        log("// Compiling '" + s + "'");
        var f = _compile(readFile(s), options["verbose"] ? print : undefined);
        log("// Executing '" + s + "'");
        photon.send({f:f}, "f");
    } catch(e)
    {
        print(e.stackTrace);
        throw e;
    }

    if (options["report"])
        reportPerformance();
}

if (options["inline_cache"])
{
    eval(readFile("../inline.js"));
}


photon.optimize_get = true;
photon.optimize_set = true;
Array.prototype.slice.call(arguments, 0).forEach(init_client);

