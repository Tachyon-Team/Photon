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

@{["ref", photon.frame]}@.call = function ()
{
    this;
    return @{(function () 
    {
        var sizeof_ref = photon.send(photon.object, "__ref_size__");
        var shft       = Math.log(sizeof_ref)/Math.log(2);
        var LOOP       = _label();
        var END        = _label();
        return ["code",
               [_op("mov", _EAX, _ECX),
                _op("mov", _mem(0, _ECX), _EDX),   // retrieve n
                _op("mov", _EDX, _EAX),            // Compute space needed on stack
                _op("add", _$(3), _EAX),           // Add space for n, self, closure
                _op("sal", _$(shft), _EAX),        // Compute the number of bytes needed
                _op("sub", _EAX, _ESP),            // Adjust stack pointer
                _op("and", _$(-16), _ESP),         // Align stack pointer 
                _op("mov", _EDX, _mem(0, _ESP)),   // Store argument number 
                _op("add", _$(2), _EDX),           // Add extra arguments
           
            LOOP,                                   // Copy all frame fields to the stack
                _op("mov", _mem(0, _ECX, _EDX, sizeof_ref), _EAX),
                _op("mov", _EAX, _mem(0, _ESP, _EDX, sizeof_ref)),
                _op("dec", _EDX),
                _op("cmp", _$(0), _EDX),           
                _op("jg", LOOP),

                _op("mov", _mem(2*sizeof_ref, _ECX), _EAX),
                _op("call", _EAX)]];

        // Stack cleanup is implicit in the function return
    })();}@;
};

Function.prototype.apply = function ()
{
    var fn  = this;

    if ($arguments_length === 0)
    {
        var rcv = @{["ref", photon.global]}@;
    } else
    {
        var rcv = $arguments[@0];
    }

    if ($arguments_length < 2)
    {
        var args = [];
    } else
    {
        var args = $arguments[@1];
    }

    var f = @{["ref", photon.frame]}@.__new__(args, rcv, fn);
    return f.call();
}

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
