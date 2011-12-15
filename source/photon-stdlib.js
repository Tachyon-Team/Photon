function Empty()
{
    return this;
}

Empty.prototype   = Empty;
Empty.constructor = null;

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

Function.prototype.call = function ()
{
    let (t = this, i = 0)
    {
        if ($arguments_length === 0)
        {
            this = @{["ref", photon.global]}@;
        } else
        { 
            this = $arguments[@0];

            for (i=1; i < $arguments_length; ++i)
            {
                $arguments[@i-1] = $arguments[@i];
            }

            $arguments_length -= 1;
        }

        $closure = t;
    }

    @{["code", 
        [_op("pop", _EBP),
         _op("jmp", _EAX)]]}@;
};

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
