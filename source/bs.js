function compile(s, print)
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

    print("Parsing");
    var ast = measurePerformance("Parsing", function () {
        return PhotonParser.matchAll(s, "topLevel")
    });

    print("Macro Expansion");
    ast = measurePerformance("Macro Expansion", function () {
        return PhotonMacroExp.match(ast, "trans", undefined, failer)
    });
    print("Desugaring");
    ast = measurePerformance("Desugaring", function () {
        return PhotonDesugar.match(ast, "trans", undefined, failer);
    });

    //print(PhotonPrettyPrinter.match(ast, "trans"));

    print("Variable Analysis");
    measurePerformance("Variable Analysis", function () {
        PhotonVarAnalysis.match(ast, "trans", undefined, failer);
    });

    print("Variable Scope Binding");
    ast = measurePerformance("Variable Scope Binding", function () {
        return PhotonVarScopeBinding.match(ast, "trans", undefined, failer);
    });

    /*
    print("Pretty Printing");
    measurePerformance("Pretty Printing", function () {
        print(PhotonPrettyPrinter.match(ast, "trans"));
    });
    */

    print("Code Generation");
    return measurePerformance("Code Generation", function () {
        var comp = PhotonCompiler.createInstance();
        code = comp.match(ast, "trans", undefined, failer);
        var f = comp.context.new_function_object(code, comp.context.refs, 0, print);
        f.functions = comp.context.functions;
        return f;
    });
}
print("\nBS Compiling");
var start_stats = memStats();
var f = measurePerformance("Compile", function () {
    return compile(readFile("test1.js"), print);
});
reportPerformance();
var stats = memStats();
for (p in stats)
{
    //print(p + ": " + (stats[p])/1000000 + "MB");
    print(p + ": " + (stats[p] - start_stats[p])/1000000 + "MB");
}

print("\nBS Execution");
photon.send(f, "call");

