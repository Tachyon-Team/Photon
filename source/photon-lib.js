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
    print(codeBlock.listingString());

    var f = photon.send(photon.function, "new", codeBlock.code.length);
    photon.send(f, "intern", clean(codeBlock.code));

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
    mov(_EAX, _EBX).
    and(_$(1), _EBX);

    if (n === 2)
    {
        a.
        and(_mem(0, _ESP), _EBX);
    }

    a.
    jne(FAST).
    mov(_$(0), _EBX).
    call(_EBX).
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
    mov(_$(0), _EBX).
    call(_EBX).
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
        mov(_EAX, _EBX);

        if (commut === true)
        {
            a[op](_mem(0, _ESP), _EBX);
        } else
        {
            a.
            xchg(_mem(0, _ESP), _EBX)
            [op](_mem(0, _ESP), _EBX);
        }

        var NO_OVF = _label("NO_OVF");

        a.
        jno(NO_OVF).
        mov(_$(0), _EBX).
        call(_EBX).
        label(NO_OVF).
        mov(_EBX, _EAX);

    }


    return _binop(f, true);
}

function _arith_cste(op, cste)
{
    return [
        _type_check(1),
        _op("mov", _EAX, _EBX),
        _op(op, cste, _EBX),
        _ovf_check(),
        _op("mov", _EBX, _EAX)
    ];
}

function _arith_div(isMod)
{
    var code = 
    [
        _type_check(2),
        _op("mov", _EAX, _EBX),
        _op("dec", _EBX),
        _op("mov", _mem(0, _ESP), _EAX),
        _op("dec", _EAX),
        _op("cdq"),
        _op("idiv", _EBX),
        _ovf_check(),
        _op("add", _$(4), _ESP)
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
        _op("mov", _mem(0, _ESP), _EBX),
        _op("dec", _EBX), 
        _op("imul", _EBX), 
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
        mov(_$(_TRUE), _EBX)
        [op](_EBX, _EAX);
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
        mov(_$(_FALSE), _EBX).
        cmovnz(_EBX, _EAX);
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

function _push_args(args)
{
    var code = [];

    code.push(_op("sub", _$(args.length * 4), _ESP));
    for (var i = 0; i < args.length; ++i)
    {
        code.push(args[i]);
        code.push(_op("mov", _EAX, _mem((i)*4, _ESP)));
    }

    return code;
}

function _pop_args(n)
{
    return _op("add", _$(n * 4), _ESP);
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
    return _op("mov", _mref(photon.send(photon.symbol, "intern", s)), _EAX);
}

function _send(rcv, msg, args)
{
    var CONT      = _label();
    var BIND      = _label();
    var SELF      = _label();

    return [
        _listing("SEND:"),
        _push_args(args),
        rcv,
        _op("push", _EAX),
        _op("push", _$(args.length)),

        // Inline cache
        _op("mov", _mem(-4, _EAX), _EAX),
        _op("cmp", _$(123456789), _EAX), // previousMap
        _op("jne", BIND),
        _op("mov", _$(0), _EAX), // previousMethod
        _op("call", _EAX),
        _op("jmp", CONT),

        BIND,
        // Bind
        msg,
        _op("push", _EAX),
        _op("mov", _mref(photon.bind), _EAX),
        _op("push", _$(0)), // NULL RECEIVER
        _op("push", _$(3)),  // Arg number
        _op("call", _EAX),
        _op("add", _$(12), _ESP),

        _op("cmp", _$(_UNDEFINED), _EAX),
        _op("je", CONT),
       
        // Code patching
        _op("call", SELF),
        SELF,
        _op("pop", _EBX),
        _op("mov", _mem(4, _ESP), _ECX),
        _op("mov", _mem(-4, _ECX), _ECX),
        _op("mov", _ECX, _mem(-45, _EBX)), // set previousMap
        _op("mov", _EAX, _mem(-38, _EBX)), // set previousMethod

        // Call
        _op("call", _EAX),
        
        CONT,
        _pop_args(args.length + 2)
    ];
}

function _array(xs)
{
    return [_send(_arg(_mref(photon.array)), 
                  _symbol("new"), 
                  [_arg(_$(_ref(xs.length + 10)))]),
            _op("push", _EAX),
            xs.map(function (x) 
            {
                return _send(
                    _op("mov", _mem(4, _ESP), _EAX),
                    _symbol("push"),
                    [x]
                );
            }),
            _op("pop", _EAX)
           ]; 
}

function _object(xs)
{
    return [_send(_arg(_mref(photon.object)), 
                  _symbol("new"), 
                  []),
            _op("push", _EAX),
            xs.map(function (x) 
            {
                return _send(
                    _op("mov", _mem(8, _ESP), _EAX),
                    _symbol("set"),
                    [_symbol(x[0]), x[1]]
                );
            }),
            _op("pop", _EAX)
           ]; 
}

function _compile(s)
{
    try {
        var r = PhotonParser.matchAll(s, "topLevel");
        print(r);
        //print("VarAnalysis");
        var r = PhotonVarAnalysis.matchAll([r], "trans");
        //print(r);
        var code = PhotonCompiler.matchAll([r], "trans");
        //print(code);
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
