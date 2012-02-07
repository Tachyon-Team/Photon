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
    //print("Parsing");
    var ast = PhotonParser.matchAll(s, "topLevel");
    /*
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
    */
    return PhotonPrettyPrinter.match(ast, "trans");
}

print(_pp(readFile(arguments[0])));
