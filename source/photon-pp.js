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
photon.frame.pp    = function () { return "photon.frame"; };
photon.bind        = {pp:function () { return "photon.bind"; }};
photon.super_bind  = {pp:function () { return "photon.super_bind"; }};
photon.inline_bind = {pp:function () { return "photon.inline_bind"; }};
photon.variadic_enter = {pp:function () { return "photon.inline_bind"; }};
photon.variadic_exit  = {pp:function () { return "photon.inline_bind"; }};

function _pp(s)
{
    var ast = PhotonParser.matchAll(s, "topLevel");
    return PhotonPrettyPrinter.match(ast, "trans");
}


for (var i = 0; i < arguments.length; ++i)
{
    print(_pp(readFile(arguments[i])));
}
