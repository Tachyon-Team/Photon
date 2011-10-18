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

function _fct(code, ref_labels)
{
    if (ref_labels === undefined)
    {
        ref_labels = [];
    }

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

    // Add positions of refs as tagged integers
    ref_labels.forEach(function (l)
    {
        codeBlock.gen32(_ref(l.getPos()));
    });

    // Add the number of refs as a tagged integer
    codeBlock.gen32(_ref(ref_labels.length));

    code = clean(codeBlock.code);
    var length = code.length;

    var f = photon.send(photon.function, "__new__", length);
    photon.send(f, "__intern__", code);

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

function _mref(m)
{
    assert((typeof m) === "object" && m.__addr__ !== undefined)
    return _$(addr_to_num(m.__addr__));
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

        var comp = PhotonCompiler.createInstance();
        code = comp.matchAll([r], "trans");
        //print("Code: '" + code.length + "'");

        return comp.context.gen_fct(code);
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

// Compiler context to allow easier stateful code generation from AST
PhotonCompiler.context = {   
    init:function ()
    {
        var that = Object.create(this);

        // Maintain the current block labels for changes of control flow
        that.block  = [{}];

        // Maintain local variables and their offset on the stack
        that.locals = [[{}, 0]];

        // Maintain the list of labels associated to
        // references in the function code
        that.refs   = [[]];

        return that;
    },

    push_block:function ()
    {
        this.block.push({"continue":_label(), "break":_label()});   
    },

    pop_block:function ()
    {
        this.block.pop();   
    },

    cont_lbl:function ()
    {
        return this.block[this.block.length - 1]["continue"];
    },

    break_lbl:function ()
    {
        return this.block[this.block.length - 1]["break"];
    },


    add_args:function (args)
    {
        var mapping = [{}, 0];

        for (var i = 0; i < args.length; ++i)
        {
            mapping[0][args[i]] = (i+4)*4;
        }

        this.locals.push(mapping);
    },

    add_locals:function (scope)
    {
        var mapping = this.locals[this.locals.length - 1];
        var i = -4;

        for (var n in scope)
        {
            //print(n + " = " + scope[n]);
            if (scope[n] === "local")
            {
                //print(n + " = " + i);
                mapping[0][n] = i; 
                mapping[1] = mapping[1] + 1;
                i -= 4;
            }
        }
    },

    has_local:function (name)
    {
        return this.locals[this.locals.length - 1][0][name] !== undefined;
    },

    pop_locals:function ()
    {
        this.locals.length -= 1;
    },

    loc:function (name)
    {
        return this.locals[this.locals.length - 1][0][name];
    },

    loc_nb:function ()
    {
        return this.locals[this.locals.length - 1][1];
    },

    new_ref_ctxt:function ()
    {
        this.refs.push([]);
    },

    pop_ref_ctxt:function ()
    {
        this.refs.length -= 1;
    },

    ref_ctxt:function ()
    {
        return this.refs[this.refs.length - 1];
    },

    // Code generation methods
    gen_fct:function (code)
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

        var ref_labels = this.ref_ctxt();

        // Add positions of refs as tagged integers
        ref_labels.forEach(function (l)
        {
            codeBlock.gen32(_ref(l.getPos()));
        });

        // Add the number of refs as a tagged integer
        codeBlock.gen32(_ref(ref_labels.length));

        code = clean(codeBlock.code);
        var length = code.length;
        
        //print("gen_fct code length: " + length);

        var f = photon.send(photon.function, "__new__", length);
        photon.send(f, "__intern__", code);

        return f;
    },

    gen_op:function (op)
    {
        var a = new x86.Assembler(x86.target.x86);
        var args = Array.prototype.slice.apply(arguments, [1]);
        a[op].apply(a, args);
        return a.codeBlock.code;
    },

    gen_prologue:function (local_n, arg_n)
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
    },

    gen_epilogue:function ()
    {
        var a = new x86.Assembler(x86.target.x86);
        a.
        mov(_EBP, _ESP).   
        pop(_EBP).
        ret();
        return a.codeBlock.code;
    },

    gen_type_check:function (n)
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

    },

    gen_ovf_check:function ()
    {
        var a = new x86.Assembler(x86.target.x86);
        var NO_OVF = _label("NO_OVF");

        a.
        jno(NO_OVF).
        mov(_$(0), _ECX).
        call(_ECX).
        label(NO_OVF);

        return a.codeBlock.code;
    },

    gen_binop:function (f, type_check)
    {
        if (type_check === undefined)
            type_check = false;

        var a = new x86.Assembler(x86.target.x86);
        var FAST = _label("FAST");
        var CONT = _label("CONT");

        var code = [];

        if (type_check === true)
        {
            code.push(this.gen_type_check(2));
        }

        f(a);

        code.push(a.codeBlock.code);


        return code;
    },

    gen_arith:function (op, commut)
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

        return this.gen_binop(f, true);
    },

    gen_arith_cste:function (op, cste)
    {
        return [
            this.gen_type_check(1),
            _op("mov", _EAX, _ECX),
            _op(op, cste, _ECX),
            this.gen_ovf_check(),
            _op("mov", _ECX, _EAX)
        ];
    },

    gen_arith_div:function (isMod)
    {
        var code = 
        [
            this.gen_type_check(2),
            _op("mov", _EAX, _ECX),
            _op("dec", _ECX),
            _op("mov", _mem(0, _ESP), _EAX),
            _op("dec", _EAX),
            _op("cdq"),
            _op("idiv", _ECX),
            this.gen_ovf_check()
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
    },

    gen_arith_mul:function ()
    {
        return [
            this.gen_type_check(2), 
            _op("mov", _EAX, _ECX), 
            _op("sar", _$(1), _EAX), 
            _op("mov", _mem(0, _ESP), _ECX),
            _op("dec", _ECX), 
            _op("imul", _ECX), 
            this.gen_ovf_check(),
            _op("inc", _EAX)
        ];
    },

    gen_rel:function (op, type_check)
    {
        function f(a)
        {
            a.
            cmp(_EAX, _mem(0, _ESP)).
            mov(_$(_FALSE), _EAX).
            mov(_$(_TRUE), _ECX)
            [op](_ECX, _EAX);
        }

        return this.gen_binop(f, type_check);
    },

    gen_logic:function (op)
    {
        function f(a)
        {
            a
            [op](_mem(0, _ESP), _EAX).
            cmp(_$(_TRUE), _EAX).
            mov(_$(_FALSE), _ECX).
            cmovnz(_ECX, _EAX);
        }

        return this.gen_binop(f);
    },

    gen_shiftop:function (op)
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

        return this.gen_binop(f, true);
    },

    gen_bitwise:function (op)
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

        return this.gen_binop(f, true);
    },

    gen_push_args:function (args, extra_nb)
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
    },

    gen_pop_args:function (n)
    {
        return [
            _op("add", _$(n * 4), _ESP),

            // Restore old stack pointer
            _op("pop", _ESP)
        ];
    },

    gen_mref:function (m)
    {
        var label = _label();
        this.ref_ctxt().push(label);

        assert((typeof m) === "object" && m.__addr__ !== undefined)
        return _$(addr_to_num(m.__addr__), label);
    },

    gen_arg:function (a)
    {
        return _op("mov", a, _EAX);
    },

    gen_symbol:function (s)
    {
        //print("internalizing symbol: " + s);
        return _op("mov", this.gen_mref(photon.send(photon.symbol, "__intern__", s)), _EAX);
    },

    gen_send:function (rcv, msg, args, bind_helper)
    {
        if (bind_helper === undefined)
        {
            bind_helper = photon.bind;
        }

        var CONT      = _label();

        return [
            this.gen_push_args(args, 2),
            rcv,
            //_op("sub", _$(8), _ESP),
            //_op("push", _EAX),
            //_op("push", _$(args.length)),
            _op("mov", _EAX, _mem(4, _ESP)),
            _op("mov", _$(args.length), _mem(0, _ESP), 32),

            // Bind
            msg,
            _op("push", _EAX),
            _op("mov", this.gen_mref(bind_helper), _EAX),
            _op("push", _$(0)), // NULL RECEIVER
            _op("push", _$(3)),  // Arg number
            _op("call", _EAX),
            _op("add", _$(12), _ESP),

            _op("cmp", _$(_UNDEFINED), _EAX),
            _op("je", CONT),

            // Call
            _op("call", _EAX),
            
            CONT,
            this.gen_pop_args(args.length + 2),
        ];

            // Inline cache
            //_op("mov", _mem(-4, _EAX), _EAX),
            //_op("cmp", _$(123456789), _EAX), // previousMap
            //_op("jne", BIND),
            //_op("mov", _$(0), _EAX), // previousMethod
            //_op("call", _EAX),
            //_op("jmp", CONT),

            // Code patching
            //_op("call", SELF),
            //SELF,
            //_op("pop", _EDX),
            //_op("mov", _mem(4, _ESP), _ECX),
            //_op("mov", _mem(-4, _ECX), _ECX),
            //_op("mov", _ECX, _mem(-45, _EDX)), // set previousMap
            //_op("mov", _EAX, _mem(-38, _EDX)), // set previousMethod
    },

    gen_array:function (xs)
    {
        var that = this;

        r_xs = xs.slice(0).reverse();

        return [r_xs.map(function (x)
                {
                    return [x, _op("push", _EAX)];
                }),
                this.gen_send(this.gen_arg(this.gen_mref(photon.array)), 
                      this.gen_symbol("__new__"), 
                      [this.gen_arg(_$(_ref(xs.length + 10)))]),
                _op("mov", _EAX, _EDX),
                xs.map(function (x) 
                {
                    return [
                        _op("pop", _EAX),
                        _op("push", _EDX),
                        that.gen_send(
                            _op("mov", _EDX, _EAX),
                            that.gen_symbol("__push__"),
                            [[]]
                        ),
                        _op("pop", _EDX)
                    ];
                }),
                _op("mov", _EDX, _EAX)
               ]; 
    },

    gen_object:function (xs)
    {
        var that = this;
        return [
                _op("push", _EBX),        // Extra register needed, 
                                          // ECX is used for stack alignment
                xs.map(function (x) 
                {
                    return [
                        that.gen_symbol(x[0]), // name
                        _op("push", _EAX),
                        x[1],          // value
                        _op("push", _EAX),
                    ];
                }),
                this.gen_send(this.gen_arg(this.gen_mref(photon.object)), 
                      this.gen_symbol("__new__"), 
                      []),
                _op("mov", _EAX, _EDX),
                xs.map(function (x) 
                {
                    return [
                        _op("pop", _EBX), // value
                        _op("pop", _EAX), // name
                        _op("push", _EDX),// preserve rcv for next prop
                        that.gen_send(
                            _op("mov", _EDX, _EAX),
                            that.gen_symbol("__set__"),
                            [[], _op("mov", _EBX, _EAX)]),
                        _op("pop", _EDX)
                    ];
                }),
                _op("mov", _EDX, _EAX),
                _op("pop", _EBX)          // Extra register restored
               ]; 
    }
};
