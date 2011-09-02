function _asm(code)
{
    var a = new x86.Assembler(x86.target.x86);

    if (code !== undefined) a.codeBlock.code = code;

    return a;
}

function flatten(code)
{
    function helper(code)
    {
        for (var i = 0; i < code.length; ++i)
        {
            if (code[i] instanceof Array)
            {
                helper(code[i]);
            } else
            {
                a.push(code[i]);
            }
        }
    }

    var a = [];

    helper(code);

    return a;
}

function clean(code)
{
    var a = [];

    for (var i = 0; i < code.length; ++i)
    {
        if (typeof code[i] === "number")
        {
            a.push(code[i]);
        }
    }

    return a;
}

function addr_to_num(addr)
{
    var n = 0;

    for (var i = addr.length - 1; i >= 0; --i)
    {
        n = num_shift(n,8);
        n = num_add(n, addr[i]);
    }

    return n;
}

function _fct(code)
{
    //print("Code AST");
    //print(code);
    code = flatten(code);
    //print("Flattened Code AST");
    //print(clean(code));
    var codeBlock = _asm(code).codeBlock;
    //print("assemble");
    codeBlock.assemble();
    //print(codeBlock.code);
    //print("listing");
    //print(codeBlock.listingString());

    var f = photon.send(photon.function, "__new__", codeBlock.code.length);
    photon.send(f, "__intern__", clean(codeBlock.code));

    return f;
}

const _reg       = x86.Assembler.prototype.register;
const _ESP       = _reg.esp;
const _EBP       = _reg.ebp;
const _EAX       = _reg.eax;
const _EBX       = _reg.ebx;
const _ECX       = _reg.ecx;
const _EDX       = _reg.edx;
const _$         = x86.Assembler.prototype.immediateValue;
const _mem       = x86.Assembler.prototype.memory;
const _label     = asm.CodeBlock.prototype.label;
const _listing   = asm.CodeBlock.prototype.listing;
const _FALSE     = 4;
const _NIL       = 2;
const _TRUE      = 6;
const _UNDEFINED = 0;
var   _ERR_HANDLER = {__addr__:[0,0,0,0]};

function _op(op)
{
    var a = new x86.Assembler(x86.target.x86);
    var args = Array.prototype.slice.apply(arguments, [1]);
    a[op].apply(a, args);
    return a.codeBlock.code;
}

function _ref(n)
{
    return (n * 2) + 1;
}

function _fx(n)
{
    return (n - 1) / 2; 
}

function _prologue(local_n, arg_n)
{
    var FAST = _label("FAST_ENTRY");
    var a = new x86.Assembler(x86.target.x86);
    a.
   
    // Check arg number
    cmp(_$(arg_n), _mem(4, _ESP), 32).
    je(FAST).
    mov(_$(0), _EAX).
    call(_EAX).

    // Fast entry point
    label(FAST).

    // Setup stack frame 
    push(_EBP).
    mov(_ESP, _EBP).

    // Reserve space for locals
    sub(_$(4*local_n), _ESP);
    return a.codeBlock.code;
}

function _epilogue()
{
    var a = new x86.Assembler(x86.target.x86);
    a.
    mov(_EBP, _ESP).   
    pop(_EBP).
    ret();
    return a.codeBlock.code;
}

function _type_check(n)
{
    if (n === undefined)
    {
        n = 2;
    }

    var a = new x86.Assembler(x86.target.x86);
    var FAST = _label("FAST");

    a.
    genListing("TYPE TEST:").
    mov(_EAX, _ECX).
    and(_$(1), _ECX);

    if (n === 2)
    {
        a.
        and(_mem(0, _ESP), _ECX);
    }

    a.
    jne(FAST).
    mov(_$(0), _ECX).
    call(_ECX).
    //jmp(CONT).
    label(FAST);

    return a.codeBlock.code;

}

function _ovf_check()
{

    var a = new x86.Assembler(x86.target.x86);
    var NO_OVF = _label("NO_OVF");

    a.
    jno(NO_OVF).
    mov(_$(0), _ECX).
    call(_ECX).
    label(NO_OVF);

    return a.codeBlock.code;
}

function _binop(f, type_check)
{
    if (type_check === undefined)
        type_check = false;

    var a = new x86.Assembler(x86.target.x86);
    var FAST = _label("FAST");
    var CONT = _label("CONT");

    var code = [];

    if (type_check === true)
    {
        code.push(_type_check(2));
    }

    f(a);

    code.push(a.codeBlock.code);


    return code;
}
function _arith(op, commut)
{
    function f(a)
    {
        a.
        mov(_EAX, _ECX);

        if (commut === true)
        {
            a[op](_mem(0, _ESP), _ECX);
        } else
        {
            a.
            xchg(_mem(0, _ESP), _ECX)
            [op](_mem(0, _ESP), _ECX);
        }

        var NO_OVF = _label("NO_OVF");

        a.
        jno(NO_OVF).
        mov(_$(0), _ECX).
        call(_ECX).
        label(NO_OVF).
        mov(_ECX, _EAX);

    }


    return _binop(f, true);
}

function _arith_cste(op, cste)
{
    return [
        _type_check(1),
        _op("mov", _EAX, _ECX),
        _op(op, cste, _ECX),
        _ovf_check(),
        _op("mov", _ECX, _EAX)
    ];
}

function _arith_div(isMod)
{
    var code = 
    [
        _type_check(2),
        _op("mov", _EAX, _ECX),
        _op("dec", _ECX),
        _op("mov", _mem(0, _ESP), _EAX),
        _op("dec", _EAX),
        _op("cdq"),
        _op("idiv", _ECX),
        _ovf_check()
    ];

    if (isMod)
    {
        code.push(_op("mov", _EDX, _EAX));
    } else
    {
        code.push(_op("sal", _$(1), _EAX));
    }

    code.push(_op("inc", _EAX));

    return code;
}

function _arith_mul()
{
    return [
        _type_check(2), 
        _op("mov", _EAX, _ECX), 
        _op("sar", _$(1), _EAX), 
        _op("mov", _mem(0, _ESP), _ECX),
        _op("dec", _ECX), 
        _op("imul", _ECX), 
        _ovf_check(),
        _op("inc", _EAX)
    ];
}

function _rel(op, type_check)
{
    function f(a)
    {
        a.
        cmp(_EAX, _mem(0, _ESP)).
        mov(_$(_FALSE), _EAX).
        mov(_$(_TRUE), _ECX)
        [op](_ECX, _EAX);
    }

    return _binop(f, type_check);
}

function _logic(op)
{
    function f(a)
    {
        a
        [op](_mem(0, _ESP), _EAX).
        cmp(_$(_TRUE), _EAX).
        mov(_$(_FALSE), _ECX).
        cmovnz(_ECX, _EAX);
    }

    return _binop(f);
}

function _shiftop(op)
{
    function f(a)
    {
        a.
        mov(_EAX, _ECX).
        sar(_$(1), _ECX).
        mov(_mem(0, _ESP), _EAX).
        sar(_$(1), _EAX)
        [op](_reg.cl, _EAX).
        sal(_$(1), _EAX).
        inc(_EAX);
    }

    return _binop(f, true);
}

function _bitwise(op)
{
    function f(a)
    {
        a.
        mov(_EAX, _ECX).
        sar(_$(1), _ECX).
        mov(_mem(0, _ESP), _EAX).
        sar(_$(1), _EAX)
        [op](_ECX, _EAX).
        sal(_$(1), _EAX).
        inc(_EAX);
    }

    return _binop(f, true);
}

function _push_args(args, extra_nb)
{
    if (extra_nb === undefined)
    {
        extra_nb = 0;
    }

    var code = [
        _op("mov", _ESP, _ECX),

        //_op("sub", _$((args.length + extra_nb)*4), _ESP)
        // Align stack for OS X ABI 
        _op("sub", _$((args.length + extra_nb + 1)* 4), _ESP),
        _op("and", _$(-16), _ESP),

        // Preserve old stack pointer
        _op("mov", _ECX, _mem((args.length + extra_nb)*4, _ESP))

    ];

    // Place all new arguments
    for (var i = 0; i < args.length; ++i)
    {
        code.push(args[i]);
        code.push(_op("mov", _EAX, _mem((i + extra_nb)*4, _ESP)));
    }

    return code;
}

function _pop_args(n)
{
    return [
        _op("add", _$(n * 4), _ESP),

        // Restore old stack pointer
        _op("pop", _ESP)
    ];
}

function _mref(m)
{
    assert((typeof m) === "object" && m.__addr__ !== undefined)
    return _$(addr_to_num(m.__addr__));
}

function _arg(a)
{
    return _op("mov", a, _EAX);
}

function _symbol(s)
{
    //print("internalizing symbol: " + s);
    return _op("mov", _mref(photon.send(photon.symbol, "__intern__", s)), _EAX);
}

function _send(rcv, msg, args, bind_helper)
{
    if (bind_helper === undefined)
    {
        bind_helper = photon.bind;
    }

    var CONT      = _label();

    return [
        _push_args(args, 2),
        rcv,
        //_op("sub", _$(8), _ESP),
        //_op("push", _EAX),
        //_op("push", _$(args.length)),
        _op("mov", _EAX, _mem(4, _ESP)),
        _op("mov", _$(args.length), _mem(0, _ESP), 32),

        // Bind
        msg,
        _op("push", _EAX),
        _op("mov", _mref(bind_helper), _EAX),
        _op("push", _$(0)), // NULL RECEIVER
        _op("push", _$(3)),  // Arg number
        _op("call", _EAX),
        _op("add", _$(12), _ESP),

        _op("cmp", _$(_UNDEFINED), _EAX),
        _op("je", CONT),

        // Call
        _op("call", _EAX),
        
        CONT,
        _pop_args(args.length + 2),
    ];

        /*
        // Inline cache
        _op("mov", _mem(-4, _EAX), _EAX),
        _op("cmp", _$(123456789), _EAX), // previousMap
        _op("jne", BIND),
        _op("mov", _$(0), _EAX), // previousMethod
        _op("call", _EAX),
        _op("jmp", CONT),
        */


        /*
        // Code patching
        _op("call", SELF),
        SELF,
        _op("pop", _EDX),
        _op("mov", _mem(4, _ESP), _ECX),
        _op("mov", _mem(-4, _ECX), _ECX),
        _op("mov", _ECX, _mem(-45, _EDX)), // set previousMap
        _op("mov", _EAX, _mem(-38, _EDX)), // set previousMethod
        */
}

function _array(xs)
{
    r_xs = xs.slice(0).reverse();

    return [r_xs.map(function (x)
            {
                return [x, _op("push", _EAX)];
            }),
            _send(_arg(_mref(photon.array)), 
                  _symbol("__new__"), 
                  [_arg(_$(_ref(xs.length + 10)))]),
            _op("mov", _EAX, _EDX),
            xs.map(function (x) 
            {
                return [
                    _op("pop", _EAX),
                    _op("push", _EDX),
                    _send(
                        _op("mov", _EDX, _EAX),
                        _symbol("__push__"),
                        [[]]
                    ),
                    _op("pop", _EDX)
                ];
            }),
            _op("mov", _EDX, _EAX)
           ]; 
}

function _object(xs)
{
    return [
            _op("push", _EBX),        // Extra register needed, 
                                      // ECX is used for stack alignment
            xs.map(function (x) 
            {
                return [
                    _symbol(x[0]), // name
                    _op("push", _EAX),
                    x[1],          // value
                    _op("push", _EAX),
                ];
            }),
            _send(_arg(_mref(photon.object)), 
                  _symbol("__new__"), 
                  []),
            _op("mov", _EAX, _EDX),
            xs.map(function (x) 
            {
                return [
                    _op("pop", _EBX), // value
                    _op("pop", _EAX), // name
                    _op("push", _EDX),// preserve rcv for next prop
                    _send(
                        _op("mov", _EDX, _EAX),
                        _symbol("__set__"),
                        [[], _op("mov", _EBX, _EAX)]),
                    _op("pop", _EDX)
                ];
            }),
            _op("mov", _EDX, _EAX),
            _op("pop", _EBX)          // Extra register restored
           ]; 
}

function _compile(s)
{
    try {
        var r = PhotonParser.matchAll(s, "topLevel");
        //print("Macro Exp");
        //print(r);
        r = PhotonMacroExp.matchAll([r], "trans");
        //print(r);
        //print("AST: '" + r + "'");
        //print("VarAnalysis");
        var r = PhotonVarAnalysis.matchAll([r], "trans");
        //print("Compilation");
        code = PhotonCompiler.matchAll([r], "trans");
        //print("Code: '" + code.length + "'");

        return _fct(code);
    } catch(e)
    {
        if (e.stack)
            print(e.stack);
        else
            print(e);
    }
}

function _ast_frequency(s)
{
    var r = PhotonParser.matchAll(s, "topLevel");
    r = ASTFrequency.matchAll([r], "trans");
    r.freqs();
}

function _deep_copy(o)
{
    if (o instanceof Array)
    {
        var new_a = [];

        for (var i = 0; i < o.length; ++i)
        {
            new_a.push(_deep_copy(o[i]));
        }

        return new_a;
    } else if (o instanceof Object)
    {
        var new_o = {};

        for (var p in o)
        {
            if (o.hasOwnProperty(p))
            {
                new_o[p] = _deep_copy(o[p]);
            }
            new_o.__proto__ = o.__proto__;
        }

        return new_o;
    } else 
    {
        return o;
    }
}

function _new_context()
{
    return {
        scope:{},
        macros:{},
        consts:{}
    };
}
