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

Object.prototype.__instanceof__ = function (f)
{
    var o = this;
    var proto = f.prototype;

    while (o !== null)
    {
        if (o === proto)
        {
            return true;
        }

        o = o[@-2];
    }

    return false;
};

Object.prototype.__typeof__ = function ()
{
    return "object";
};

Object.create = function (obj)
{
    return obj.__new__();
};

Object.prototype.hasOwnProperty = function (p)
{
    return false;
}

Object.prototype.__itr__ = function ()
{
    return {
        _obj:this,
        _visited:{},
        _idx:-1,
        init:function ()
        {
            this.next();
            return this;
        },
        valid:function ()
        {
            return (this._obj !== undefined && this._obj !== null);
        },
        get:function ()
        {
            var map = this._obj[@-1];
            var r = map[@3+4*this._idx];    
            this.next();
            return r;
        },
        next:function ()
        {
            this._idx++;
            var r = null;

            while (r === null && this.valid())
            {
                var map = this._obj[@-1];

                if (this._idx < map[@1])
                {
                    var p = map[@3+4*this._idx];    

                    if (this._visited[p] === undefined)
                    {
                        r = p;
                        this._visited[p] = true;
                    } else
                    {
                        this._idx++;
                    }
                } else
                {
                    this._obj = this._obj[@-2];
                    this._idx = 0;
                }
            }
        }
    }.init();
};

/**
15.4.2 Array constructor function.
new Array (len)
new Array ([item0 [, item1 [, … ]]])
Array ([item0 [, item1 [, … ]]])
*/
function Array(len)
{
    // Constructor call with length
    if (isGlobalObj(this) === false &&
        typeof len === 'number' &&
        arguments.length === 1)
    {
        // Allocate an array of the desired capacity and set its length
        var a = Array.prototype.__new__(len);
        a.length = len;

        return a;
    }

    // Allocate an array of the desired capacity and set its length
    var a = Array.prototype.__new__(arguments.length);
    a.length = arguments.length;

    // Copy the arguments into the array
    for (var i = 0; i < arguments.length; ++i)
    {
        a[i] = arguments[i];
    }

    return a;
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

Function.prototype.__typeof__ = function ()
{
    return "function";
}

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

Function.prototype.toString = function ()
{
    return "function";
}

/**
@class 15.5.2 String constructor
new String(value)
String(value)
*/
function String(value)
{
    // If this is a constructor call (new String)
    if (isGlobalObj(this) === false)
    {
        throw "String: object strings not supported";
    }
    else if (typeof value !== "string")
    {
        throw "String: object conversion to string not supported";
    } else
    {
        return value;
    }
}

String.prototype = @{["ref", photon.symbol]}@;
String.prototype.constructor = String;
String.constructor = Function;

String.prototype.__typeof__ = function ()
{
    return "string";
}

String.prototype.__get__ = function (i)
{
    if (i === "length")
    {
        return this[@-3] - 1;
    } else if ((typeof i) === "number" && i >= 0 && i < this.length)
    {
        throw "String.prototype.__get__: character indexing not supported";
    } else 
    {
        return super(this).__get__(i);
    }
}

@{["ref", photon.constant]}@.__typeof__ = function ()
{
    if (this === undefined)
    {
        return "undefined";
    } else if (this === null)
    {
        return "object";
    } else if (this === true || this === false)
    {
        return "boolean";
    } else
    {
        throw "Invalid constant";
    }
};

@{["ref", photon.constant]}@.__itr__ = function ()
{
    return {valid:function () { return false; }, next:function () { return null; }};
};

@{["ref", photon.fixnum]}@.__typeof__ = function ()
{
    return "number";
}

function print(s)
{
    s.__print__();
    return undefined;
}

function isGlobalObj(o)
{
    return o === this;
}

photon = {};
photon.object = @{["ref", photon.object]}@;
photon.array  = @{["ref", photon.array]}@;
photon.send   = function (obj, msg)
{
    // Written this way because C functions do not support the apply message
    return Function.prototype.apply.call(obj[msg], obj, arguments.slice(2));
}
