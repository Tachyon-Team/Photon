macro map_property_size()
{
    return @{["number", photon.send(photon.map, "__property_size__") /
                        photon.send(photon.object, "__ref_size__")]}@;
}

macro map_base_size()
{
    return @{["number", photon.send(photon.map, "__base_size__") /
                        photon.send(photon.object, "__ref_size__")]}@;
}

macro map_count_offset()
{
    return 1;
}

macro object_prototype_offset()
{
    return -2;
}

macro object_map_offset()
{
    return -1;
}

macro object_extension_offset()
{
    return -5;
}

macro object_map(o)
{
    return o[@object_map_offset()];
}

macro object_extension(o)
{
    return o[@object_extension_offset()];
}

macro object_prototype(o)
{
    return o[@object_prototype_offset()];
}

macro map_property_name(m, idx)
{
    return m[@map_base_size() + idx*map_property_size()];
}

macro map_count(m)
{
    return m[@map_count_offset()];
}


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
    return obj.__new_default__();
};

Object.prototype.__new_default__ = Object.prototype.__new_fast__; 

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
            var map = object_map(object_extension(this._obj));
            var r = map_property_name(map, this._idx);
            this.next();
            return r;
        },
        next:function ()
        {
            this._idx++;
            var r = null;

            while (r === null && this.valid())
            {
                var map = object_map(object_extension(this._obj));

                if (this._idx < map_count(map))
                {
                    var p = map_property_name(map, this._idx);

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
                    this._obj = object_prototype(object_extension(this._obj));
                    this._idx = 0;
                }
            }
        }
    }.init();
};

Object.prototype.toString = function ()
{
    return "[object Object]";
};

Object.prototype.valueOf = function ()
{
    return this;    
};

Object.prototype.isPrototypeOf = function (x)
{
    var o = x;

    while (o !== null)
    {
        if (o === this)
        {
            return true;
        }

        o = o[@-2];
    }

    return false;
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

Array.prototype.__new_default__ = function ()
{
    return this.__new__(0);
};

function Function()
{
    return this;
}
Function.prototype = @{["ref", photon.function]}@;
Function.prototype.constructor = Function;
Function.constructor = Empty;

Function.prototype.__new_default__ = function ()
{
    return this.__new__(0,0);
};

Function.prototype.__typeof__ = function ()
{
    return "function";
};

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
        
        var ARG_LOOP   = _label();
        var ALIGN      = _label();
        var ALIGN_END  = _label();

        return ["code",
               [_op("mov", _EAX, _ECX),
                _op("mov", _mem(0, _ECX), _EDX),   // retrieve n
                _op("sar", _$(1), _EDX),           // unbox n
                _op("mov", _EDX, _EAX),            // Compute space needed on stack
                _op("add", _$(3), _EAX),           // Add space for n, self, closure

                ARG_LOOP,                          // Reserve space on stack,
                _op("cmp", _$(0), _EAX),           // initialize to UNDEFINED for proper GC support
                _op("je", ALIGN),
                _op("push", _$(_UNDEFINED)),
                _op("dec", _EAX),
                _op("jmp", ARG_LOOP),

                ALIGN,
                _op("mov", _ESP, _EAX),

                _op("and", _$(0xF), _EAX),          // Non-aligned by 1 word
                _op("je", ALIGN_END),
                _op("push", _$(_UNDEFINED)),
                _op("sub", _$(sizeof_ref), _EAX),
                _op("cmp", _$(0), _EAX),            // Non-aligned by 2 word
                _op("je", ALIGN_END),
                _op("push", _$(_UNDEFINED)),
                _op("sub", _$(sizeof_ref), _EAX),
                _op("cmp", _$(0), _EAX),            // Non-aligned by 3 word
                _op("je", ALIGN_END),
                _op("push", _$(_UNDEFINED)),
                ALIGN_END,

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

Function.prototype.length = 0;

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
    } else
    {
        return value.toString();
    }
}

String.prototype = @{["ref", photon.symbol]}@;
String.prototype.constructor = String;
String.constructor = Function;

String.prototype.__new_default__ = function ()
{
    return this.__new__(0);
};

String.prototype.__typeof__ = function ()
{
    return "string";
}

String.prototype.__instanceof__ = function () { return false; };

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

String.prototype.toString = function ()
{
    return this;
};

String.prototype.__add__ = function (x)
{
    return this.toString().concat(x.toString());
};

String.prototype.__lt__ = function (x)
{
    var i = 0, j = 0;

    var l1 = this.length;
    var l2 = x.length;

    var a = this;
    var b = x;

    while (i < l1 && j < l2)
    {
        var c1 = a.charCodeAt(i);
        var c2 = b.charCodeAt(j);

        if (c1 === c2)
        {
            ++i;
            ++j;
        } else
        {
            return c1 < c2;
        }
    }

    return j < l2;
};

String.prototype.__le__ = function (x)
{
    if (this === x) 
    {
        return true;
    }
    else
    {
        return this.__lt__(x);
    }
};

String.prototype.__gt__ = function (x)
{
    return !this.__le__(x);
};

String.prototype.__ge__ = function (x)
{
    return !this.__lt__(x);
};

function Number(v)
{
    if (typeof v === "string")
    {
        var n = 0;
        var s = v.toCharCodeArray();
        var l = s.length;
        var digits = bignum_digits.toCharCodeArray();

        for (var i = 0; i < l; ++i)
        {
            var d = digits.indexOf(s[i]);
            n = 10*n + d;
        }
        return n;
    } else if (typeof v === "number")
    {
        return v;
    } else
    {
        throw "Number: unsupported argument type '" + (typeof v) + "'";
    }
};

Number.prototype.__lt__ = function (x)
{
    throw "Unimplemented Number.prototype.__lt__";
};

Number.prototype.__le__ = function (x)
{
    throw "Unimplemented Number.prototype.__le__";
};

Number.prototype.__gt__ = function (x)
{
    throw "Unimplemented Number.prototype.__gt__";
};

Number.prototype.__ge__ = function (x)
{
    throw "Unimplemented Number.prototype.__ge__";
};

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

@{["ref", photon.constant]}@.__instanceof__ = function () { return false; };

@{["ref", photon.constant]}@.__itr__ = function ()
{
    return {valid:function () { return false; }};
};

@{["ref", photon.constant]}@.toString = function ()
{
    if (this === undefined)
    {
        return "";
    } else if (this === null)
    {
        return "null";
    } else if (this === true)
    {
        return "true";
    } else if (this === false)
    {
        return "false";
    } else
    {
        throw "Invalid constant";
    }
};

@{["ref", photon.constant]}@.__addr_bytes__ = Object.prototype.__addr_bytes__;

@{["ref", photon.constant]}@.__get__ = function (x)
{
    throw "Invalid __get__(" + x + ") operation on '" + this.toString() + "'";
}

// Note: Should be the last method added since it prevents 
// further modifications
@{["ref", photon.constant]}@.__set__ = function ()
{
    throw "Invalid __set__ operation on '" + this.toString() + "'";
}

@{["ref", photon.fixnum]}@.__typeof__ = function ()
{
    return "number";
}

@{["ref", photon.fixnum]}@.__instanceof__ = function () { return false; }

@{["ref", photon.fixnum]}@.toString = function () { return num_to_string(this); };

function print(s)
{
    s.__print__();
    return undefined;
}

function isGlobalObj(o)
{
    return o === this;
}

function mirror(o)
{
    return {
        __obj__:o,
        __addr__:true,
        __addr_bytes__:function () { return this.__obj__.__addr_bytes__(); }
    }
}

photon = {};
photon.object       = mirror(@{["ref", photon.object]}@)
photon.array        = mirror(@{["ref", photon.array]}@);
photon["function"]  = mirror(@{["ref", photon.function]}@);
photon.global       = mirror(@{["ref", photon.global]}@);
photon.cell         = mirror(@{["ref", photon.cell]}@);
photon.map          = mirror(@{["ref", photon.map]}@);
photon.symbol       = mirror(@{["ref", photon.symbol]}@);
photon.fixnum       = mirror(@{["ref", photon.fixnum]}@); 
photon.symbol_table = mirror(@{["ref", photon.symbol_table]}@); 

photon.bind       = mirror(@{["ref", photon.bind]}@);
photon.super_bind = mirror(@{["ref", photon.super_bind]}@);
photon.inline_bind = mirror(@{["ref", photon.inline_bind]}@);

photon.variadic_enter = mirror(@{["ref", photon.variadic_enter]}@);
photon.variadic_exit  = mirror(@{["ref", photon.variadic_exit]}@);

photon.handlers = {};
for (n in _handlers)
{
    photon.handlers[n] = mirror(_handlers[n]);
}

photon.array.pp    = function () { return "photon.array"; };
photon.object.pp   = function () { return "photon.object"; };
photon.function.pp = function () { return "photon.function"; };
photon.global.pp   = function () { return "photon.global"; };
photon.cell.pp     = function () { return "photon.cell"; };
photon.map.pp      = function () { return "photon.map"; };
photon.symbol.pp   = function () { return "photon.symbol"; };
photon.fixnum.pp   = function () { return "photon.fixnum"; };

photon.send   = function (obj, msg)
{
    // Extracting mirror
    if (obj.__obj__ !== undefined)
        obj = obj.__obj__;

    // Written this way because C functions do not support the apply message
    var r =  Function.prototype.apply.call(obj[msg], obj, arguments.slice(2));

    if (typeof r === "object" || typeof r === "string" || typeof r === "function")
    {
        return mirror(r);
    } else
    {
        return r;
    }
}

function eval(s)
{
    function failer (m, idx, f) 
    { 
        print("Matched failed at index " + idx + " on input " + m.input.hd); 
        error(f);
    };
    print("// eval: Parsing");
    var ast = PhotonParser.matchAll(s, "topLevel");
    print("// eval: Macro Expansion");
    ast = PhotonMacroExp.match(ast, "trans", undefined, failer);
    print("// eval: Desugaring");
    ast = PhotonDesugar.match(ast, "trans", undefined, failer);
    print("// eval: Variable scope analysis");
    PhotonVarAnalysis.match(ast, "trans", undefined, failer);
    print("// eval: Variable scope binding");
    ast = PhotonVarScopeBinding.match(ast, "trans", undefined, failer);
    //print(PhotonPrettyPrinter.match(ast, "trans", undefined, failer));
    print("// eval: Optimizing");
    ast = PhotonOptimizer.match(ast, "trans", undefined, failer);
    print("// eval: Code Generation");
    var comp = PhotonCompiler.createInstance();
    var code = comp.match(ast, "trans", undefined, failer);
    print("// eval: Function construction");
    var f = comp.context.new_function_object(code, comp.context.refs, 0);
    print("// eval: Executing generated code");
    return f.__obj__();
}

function eval_instr(s)
{
    function failer (m, idx, f) 
    { 
        print("Matched failed at index " + idx + " on input " + m.input.hd); 
        error(f);
    };
    var ast;
    return measurePerformance("eval", function () {
        ast = measurePerformance("Parsing", function () {
            return PhotonParser.matchAll(s, "topLevel");
        });
        ast = measurePerformance("Macro Expansion", function () {
            return PhotonMacroExp.match(ast, "trans", undefined, failer);
        });
        ast = measurePerformance("Desugaring", function () {
            return PhotonDesugar.match(ast, "trans", undefined, failer);
        });
        ast = measurePerformance("Variable Scope Analysis", function () {
            return PhotonVarAnalysis.match(ast, "trans", undefined, failer);
        });
        ast = measurePerformance("Variable Scope Binding", function () {
            return PhotonVarScopeBinding.match(ast, "trans", undefined, failer);
        });
        ast = measurePerformance("Optimizing", function () {
            return PhotonOptimizer.match(ast, "trans", undefined, failer);
        });
        var comp;
        var code = measurePerformance("Code Generation", function () {
            comp = PhotonCompiler.createInstance();
            return comp.match(ast, "trans", undefined, failer);
        });
        var f = measurePerformance("Function Construction", function () {
             return comp.context.new_function_object(code, comp.context.refs, 0, print);
        });
        var result = measurePerformance("Executing Generated Code", function () {
            return f.__obj__();
        });
        return result;
    });
}

function pp(s)
{
    function failer (m, idx, f) 
    { 
        print("Matched failed at index " + idx + " on input " + m.input.hd); 
        error(f);
    };
    print("pp: Parsing");
    var ast = PhotonParser.matchAll(s, "topLevel");
    print("pp: Macro Expansion");
    ast = PhotonMacroExp.match(ast, "trans", undefined, failer);
    print("pp: Desugaring");
    ast = PhotonDesugar.match(ast, "trans", undefined, failer);

    print("pp: Variable scope analysis");
    PhotonVarAnalysis.match(ast, "trans", undefined, failer);

    print(PhotonPrettyPrinter.match(ast, "trans"));

    print("pp: Variable scope binding");
    ast = PhotonVarScopeBinding.match(ast, "trans", undefined, failer);
    print(PhotonPrettyPrinter.match(ast, "trans"));
}
