function Empty()
{
    return this;
}

function Object()
{
    return this;
}

Object.prototype  = @{["ref", photon.object]}@;
Object.prototype.constructor = Object;
Object.constructor = Function;

function Array()
{
    return this;
}
Array.prototype   = @{["ref", photon.array]}@;
Array.prototype.constructor = Array;
Array.constructor = Function;

function Function()
{
    return this;
}
Function.prototype = @{["ref", photon.function]}@;
Function.prototype.constructor = Function;
Function.constructor = Empty;

Empty.prototype   = Empty;
Empty.constructor = null;

function String()
{
    return this;
}
String.prototype = @{["ref", photon.symbol]}@;
String.prototype.constructor = String;
String.constructor = Function;

function print(s)
{

    if (s === undefined)
    {
        "undefined".__print__();
    } else if (s === true)
    {
        "true".__print__();
    } else if (s === false)
    {
        "false".__print__();
    } else if (s === null)
    {
        "null".__print__();
    } else
    {
        s.__print__();
    }

    return undefined;
}
