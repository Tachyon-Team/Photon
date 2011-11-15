photon.protocol = {
    base_arg_nb:3
};


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

    var f = photon.send(photon.function, "__new__", length, 0);
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
        print("VarAnalysis");
        var r = PhotonVarAnalysis.matchAll([r], "trans");
        print(r);
         
        
        print("Compilation");

        var comp = PhotonCompiler.createInstance();
        code = comp.matchAll([r], "trans");
        //print("Code: '" + code.length + "'");
        var f = comp.context.new_function_object(code, comp.context.ref_ctxt(), 0);
        f.functions = comp.context.functions;

        return f; 
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
        consts:{},
        name:undefined
    };
}

// Variable analysis data structures

function scope(p)
{
    var that = Object.create(scope.prototype);

    // Primary fields
    that.declared = {};
    that.used     = {};
    that.parent   = p;
    that.children = [];

    if (p !== null)
    {
        p.children.push(that);
    }
    
    // Derived fields
    that._escaping  = {}; // Local vars captured by children scopes
    that._captured  = {}; // Captured from parent scope
    that._local     = [];

    return that;
}

scope.prototype.resolve = function ()
{
    function bind(id, scope)
    {
        var v = scope.declared[id];

        if (v !== undefined)
        {
            return v;
        } else if (scope.parent === null)
        {
            scope.declare(id, false);
            return bind(id, scope);
        }

        v = bind(id, scope.parent);

        if (!v.is_global())
        {
            v.scope._escaping[id] = v;        

            if (!(scope instanceof catch_scope))
            {
                scope._captured[id]   = v;
            }
        }     

        return v;
    }

    for (var id in this.used)
    {
        this.used[id] = bind(id, this);
    }

    for (var i = 0; i < this.children.length; ++i)
    {
        var c = this.children[i];

        c.resolve();
    }

    for (var id in this.declared)
    {
        var v = this.declared[id];
        if (v.is_local() && !v.isParam)
        {
            print("adding " + id + " to local");
            this._local.push(v);
        }
    }
};

scope.prototype.toString = function ()
{
    var that = this;
    var a = [];

    function stringify_set(scope, set_name)
    {
        a.push(set_name + ": {");
        
        for (var id in scope[set_name])
        {
            a.push(scope[set_name][id] + ",");
        }
        a.push("}\n");
    }

    function stringify_scope(scope)
    {
        stringify_set(scope, "declared");
        stringify_set(scope, "used");

        a.push("local: " + scope._local + "\n");
        stringify_set(scope, "_escaping");
        stringify_set(scope, "_captured");
    }

    function traverse(scope, perform)
    {
        a.push("\n");
        perform(scope);

        for (var i = 0; i < scope.children.length; ++i)
        {
            traverse(scope.children[i], perform);
        }
    }

    traverse(this, stringify_scope);

    return a.join('');
};

scope.prototype.use = function (id)
{
    if (this.used[id] === undefined)
    {
        this.used[id] = true;
    }
};

scope.prototype.declare = function (id, isParam)
{
    if (id === undefined)
    {
        var v = undefined;
    } else
    {
        var v = this.declared[id];
    }

    if (v === undefined)
    {
        var v = variable(this, id, isParam);    
        this.declared[v.id] = v;
    }

    return v;
};

scope.prototype.lookup = function (id)
{
    var v = this.used[id];

    if (v !== undefined)
    {
        return v;
    } else
    {
        return this.declared[id];
    }
};

scope.prototype.escaping = function (id)
{
    if (id === undefined)
    {
        return this._escaping;
    }

    return this._escaping[id];
};

scope.prototype.local = function ()
{
    return this._local;    
};

scope.prototype.captured = function (id)
{
    if (id === undefined)
    {
        return this._captured;
    }

    return this._captured[id];
};

function catch_scope(p, id)
{
    var that = Object.create(catch_scope.prototype);

    // Primary fields
    that.declared = {};
    that.used     = {};
    that.parent   = p;
    that.children = [];

    var d = p;
    while (d instanceof catch_scope)
    {
        d = d.parent;
    }
    that.delegate = d;

    that.declared[id] = variable(that, id, false);

    if (p !== null)
    {
        p.children.push(that);
    }
    
    // Derived fields
    that._escaping  = {}; // Local vars captured by children scopes
    that._captured  = {}; // Captured from parent scope
    that._local     = [];

    return that;
}

catch_scope.prototype = scope(null);

catch_scope.prototype.use = function (id)
{
    if (this.declared[id] === undefined)
    {
        this.delegate.use(id);
    } else
    {
        this.used[id] = this.declared[id];
    }
};

catch_scope.prototype.escaping = function (id)
{
    if (id === undefined)
    {
        var e = Object.create(this.delegate.escaping());
        
        for (var id in this._escaping)
        {
            e[id] = this._escaping[id];
        }
        return e; 
    }

    var v = this._escaping[id];

    if (v === undefined)
    {
        return this.delegate.escaping(id);
    } else
    {
        return v;
    }
};

catch_scope.prototype.captured = function (id)
{
    if (id === undefined)
    {
        var c = Object.create(this.delegate.captured());
        
        for (var id in this._captured)
        {
            c[id] = this._captured[id];
        }
        return c; 
    }

    var v = this._captured[id];

    if (v === undefined)
    {
        return this.delegate.captured(id);
    } else
    {
        return v;
    }
};

catch_scope.prototype.local = function ()
{
    var l = [];

    var local = this.delegate.local();

    for (var i = 0; i < local.length; ++i)
    {
        l.push(local[i]);
    }

    for (var i = 0; i < this._local.length; ++i)
    {
        l.push(this._local[i]);
    }

    return l;
};

catch_scope.prototype.declare = function (id, isParam)
{
    return this.delegate.declare(id, isParam);
};

catch_scope.prototype.lookup = function (id)
{
    var v = this.used[id];    

    if (v === undefined)
    {
        v = this.declared[id];

        if (v === undefined)
        {
            return this.delegate.lookup(id);
        }
    }

    return v;
};

function variable(scope, id, isParam)
{
   var that = Object.create(variable.prototype); 

   if (isParam === undefined)
   {
        isParam = false;
   }

   if (id === undefined)
   {
       id = variable.next_id++;
       that.id = "#" + id;
   } else 
   {
       that.id = id;
   }

   that.isParam = isParam;
   that.scope   = scope;

   return that;
}

// Global state
variable.next_id = 0;

variable.prototype.is_local = function ()
{
    return this.scope.declared[this.id] === this && 
           this.scope.escaping(this.id) === undefined &&
           this.scope.parent !== null;
};

variable.prototype.is_global = function ()
{
    return this.scope.parent === null;
};

variable.prototype.toString = function ()
{
    return (this.isParam ? "arg " : "var ") + this.id;
};


// Compiler context for stateful code generation from AST

PhotonCompiler.context = {   
    init:function ()
    {
        var that = Object.create(this);

        // Maintain a set of functions created during compilation
        that.functions = {};

        // Compiler constants
        that.sizeof_ref    = 4;
        that.sizeof_header = 20;

        // Offsets of this and closure parameters from frame pointer
        that.arg_nb_stack_offset = 8;
        that.this_offset         = 12;
        that.clos_offset         = 16;

        // Maintain the current block labels for changes of control flow
        that.block  = {};
        that.previous_blocks = [];

        // Maintain the current scope and associated variables
        that.scope = null;
        that.previous_scopes = [];

        // Maintain the offset of variables compared to their base pointers
        that.stack_offsets    = null;
        that.closure_offsets  = null;
        that.previous_offsets = [];

        // Maintain the list of labels associated to
        // references in the function code
        that.refs   = null;
        that.previous_refs = [[]];

        // Displacement of the frame pointer from its base position
        // in the function scope
        that.bias = 0;
        that.previous_biases = [];

        // Number of locations on the stack used by a scope
        that.stack_location_nb = 0;
        that.previous_stack_location_nb = [];

        // Nesting level of try
        that.try_lvl = 0;
        that.previous_try_lvls = [];

        return that;
    },
    
    nop:function (nb)
    {
        switch(nb)
        {
            case 1: return [0x90];
            case 2: return [0x66, 0x90];
            case 3: return [0x0f, 0x1f, 0x00];
            case 4: return [0x0f, 0x1f, 0x40, 0x00];
            case 5: return [0x0f, 0x1f, 0x44, 0x00, 0x00];
            case 6: return [0x66, 0x0f, 0x1f, 0x44, 0x00, 0x00];
            case 7: return [0x0f, 0x1f, 0x80, 0x00, 0x00, 0x00, 0x00];
            case 8: return [0x0f, 0x1f, 0x84, 0x00, 0x00, 0x00, 0x00, 0x00];
            case 9: return [0x66, 0x0f, 0x1f, 0x84, 0x00, 0x00, 0x00, 0x00, 0x00];
        }
    },

    nop_cste:function (nb)
    {
        assert(nb <= 5);

        var nop = this.nop(nb);
        var n = nop[0];

        for (var i = nop.length - 1; i >= 0; --i)
        {
            n = n << 8;
            n += nop[i];
        }

        return n;
    },

    push_block:function ()
    {
        this.previous_blocks.push(this.block);
        this.block = {"continue":_label(), "break":_label()};
    },

    pop_block:function ()
    {
        this.block = this.previous_blocks.pop();
    },

    cont_lbl:function ()
    {
        return this.block["continue"];
    },

    break_lbl:function ()
    {
        return this.block["break"];
    },

    enter_function_scope:function (scope, args)
    {
        //print("enter function scope");
        this.previous_scopes.push(this.scope);
        this.scope = scope;
        this.previous_biases.push(this.bias);
        this.bias  = 0;
        this.previous_try_lvls.push(this.try_lvl);
        this.try_lvl = 0;

        var stack_offsets = {};
        var stack_location_nb = 0;

        // Arguments offsets
        for (var i = 0; i < args.length; ++i)
        {
           stack_offsets[args[i]] = (i+photon.protocol.base_arg_nb+2)*this.sizeof_ref;
        }

        // Local variable offsets
        var offset = -this.sizeof_ref;
        var local = scope.local();
        for (var i = 0; i < local.length; ++i)
        {
            stack_offsets[local[i].id] = offset;
            offset -= this.sizeof_ref;
        }
        stack_location_nb += local.length;

        // Escaping variable offsets
        var escaping = scope.escaping();
        for (var id in escaping)
        {
            stack_offsets[id] = offset;
            offset -= this.sizeof_ref;
            stack_location_nb++;
        }

        // Captured variables offsets on the closure
        var closure_offsets = {};
        var offset = -this.sizeof_header;
        var captured = scope.captured();
        for (var id in captured)
        {
            closure_offsets[id] = offset;
            offset -= this.sizeof_ref; 
        }

        this.previous_offsets.push(this.stack_offsets);
        this.previous_offsets.push(this.closure_offsets);
        this.stack_offsets   = stack_offsets;
        this.closure_offsets = closure_offsets;
        this.previous_stack_location_nb.push(this.stack_location_nb);
        this.stack_location_nb = stack_location_nb;
    },

    leave_function_scope:function ()
    {
        //print("leave function scope");
        this.scope = this.previous_scopes.pop();
        this.bias = this.previous_biases.pop();
        this.stack_location_nb = this.previous_stack_location_nb.pop();
        this.closure_offsets = this.previous_offsets.pop();
        this.stack_offsets   = this.previous_offsets.pop();
        this.try_lvl = this.previous_try_lvls.pop();
    },

    enter_try_block:function ()
    {
        //print("enter try block");
        this.stack_location_nb += 2;
        this.previous_biases.push(this.bias);
        this.bias = this.stack_location_nb * this.sizeof_ref;
        this.try_lvl++;
    },

    leave_try_block:function ()
    {
        //print("leave try block");
        this.bias = this.previous_biases.pop();
        this.stack_location_nb -= 2;
        this.try_lvl--;
    },

    enter_catch_scope:function (scope)
    {
        //print("enter catch scope");
        this.previous_offsets.push(this.stack_offsets);
        var stack_offsets = Object.create(this.stack_offsets);

        for (var id in scope.declared)
        {
            stack_offsets[id] = (++this.stack_location_nb) * -this.sizeof_ref;
        }
        this.stack_offsets = stack_offsets;

        this.previous_scopes.push(this.scope);
        this.scope = scope;
    },

    leave_catch_scope:function ()
    {
        //print("leave catch scope");
        this.scope   = this.previous_scopes.pop();
        this.stack_offsets = this.previous_offsets.pop();
        this.stack_location_nb--;
    },

    current_scope:function ()
    {
        return this.scope;
    },

    lookup:function (id)
    {
        return this.current_scope().lookup(id);
    },

    stack_offset:function (id)
    {
        return this.stack_offsets[id] + this.bias;
    },

    this_stack_offset:function ()
    {
        return this.this_offset + this.bias;
    },

    clos_stack_offset:function ()
    {
        return this.clos_offset + this.bias;
    },

    arg_nb_stack_offset:function ()
    {
        return this.arg_nb_stack_offset + this.bias;
    },

    new_ref_ctxt:function ()
    {
        this.previous_refs.push(this.refs);
        this.refs = [];
    },

    pop_ref_ctxt:function ()
    {
        this.refs = this.previous_refs.pop();
    },

    ref_ctxt:function ()
    {
        return this.refs;
    },

    new_function_object:function (code, ref_labels, cell_nb)
    {
        if (cell_nb === undefined)
        {
            cell_nb = 0;
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

        var f = photon.send(photon.function, "__new__", length, cell_nb);
        photon.send(f, "__intern__", code);

        return f;
    },

    new_js_function_object:function (name, args, body)
    {
        var code = [
            this.gen_prologue(this.stack_location_nb, args.length),
            body,
            _op("mov", _$(_UNDEFINED), _EAX),
            this.gen_epilogue()
        ];

        var f = this.new_function_object(code, this.ref_ctxt(), 0);
        
        if (name !== undefined)
        {
            this.functions[name] = f;
        }
        
        return f;
    },

    gen_closure:function (f, scope, offsets)
    {
        var cell_init_code = [];
        var captured       = scope.captured();
        var cell_nb        = 0;

        for (id in captured)
        {
            cell_init_code.push([
                this.gen_get_cell(id),
                _op("mov", _EAX, _mem(offsets[id], _ECX))
            ]);
            cell_nb++;
        }

        var label  = _label();
        ref_labels = [label];
            
        var c = this.new_function_object([
            _op("mov", _$(addr_to_num(f.__addr__), label), _EAX),
            _op("jmp", _EAX),
        ], ref_labels, cell_nb);

        return [
            //_op("mov", this.gen_mref(c), _EAX)
            this.gen_send(
                this.gen_arg(this.gen_mref(c)),
                this.gen_symbol("__clone__"),
                []),
            _op("mov", _EAX, _ECX),
            cell_init_code,
            _op("mov", _ECX, _EAX)
        ];
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
        sub(_$(this.sizeof_ref*local_n), _ESP);

        var code = [];
        // Initialize escaping variables
        for (var id in this.current_scope().escaping())
        {
            print("Creating cell for '" + id + "'");
            //code.push(this.gen_set_local(id, [_op("mov", _$(_UNDEFINED), _EAX)]));
            code.push(this.gen_set_local(id, this.gen_new_cell()));
            code.push(this.gen_set_escaping(id, [_op("mov", _$(_UNDEFINED), _EAX)]));
        }

        return a.codeBlock.code.concat(code);
    },

    gen_epilogue:function ()
    {
        var a = new x86.Assembler(x86.target.x86);

        for (var i = 0; i < this.try_lvl; ++i)
        {
            a.mov(_mem(0, _EBP), _EBP);
        }

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
            _op("sub", _$((args.length + extra_nb + 1)*this.sizeof_ref), _ESP),
            _op("and", _$(-16), _ESP),

            // Preserve old stack pointer
            _op("mov", _ECX, _mem((args.length + extra_nb)*this.sizeof_ref, _ESP))

        ];

        // Place all new arguments
        for (var i = 0; i < args.length; ++i)
        {
            code.push(args[i]);
            code.push(_op("mov", _EAX, _mem((i + extra_nb)*this.sizeof_ref, _ESP)));
        }

        return code;
    },

    gen_pop_args:function (n)
    {
        return [
            _op("add", _$(n * this.sizeof_ref), _ESP),

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
            this.gen_push_args(args, 3),
            rcv,
            _op("mov", _$(0), _mem(8, _ESP), 32),
            _op("mov", _EAX, _mem(4, _ESP)),
            _op("mov", _$(args.length), _mem(0, _ESP), 32),

            // Bind
            msg,
            _op("push", _EAX),
            _op("mov", this.gen_mref(bind_helper), _EAX),
            _op("push", _$(0)), // NULL CLOSURE
            _op("push", _$(0)), // NULL RECEIVER
            _op("push", _$(4)),  // Arg number
            _op("call", _EAX),
            _op("add", _$(16), _ESP),

            _op("cmp", _$(_UNDEFINED), _EAX),
            _op("je", CONT),

            // Call
            _op("mov", _EAX, _mem(8, _ESP)), // SET CLOSURE
            _op("call", _EAX),
            
            CONT,
            this.gen_pop_args(args.length + 3),
        ];
    },

    gen_call:function (fn, args)
    {
        return [
            this.gen_push_args(args, 3),
            _op("mov", this.gen_mref(photon.global), _mem(4, _ESP), 32),
            _op("mov", _$(args.length), _mem(0, _ESP), 32),
            fn, 
            _op("mov", _EAX, _mem(8, _ESP)), 
            _op("call", _EAX), 
            this.gen_pop_args(args.length + 3)
        ];
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
    },

    gen_get_var:function (id)
    {
        var scope = this.current_scope();
        var v     = scope.lookup(id);
        if (v.is_local())
        {
            return this.gen_get_local(id);
        } else if (v.is_global())
        {
            return this.gen_get_global(id);
        } else if (scope.escaping(id) === v)
        {
            return this.gen_get_escaping(id);
        } else if (scope.captured(id) === v)
        {
            return this.gen_get_captured(id);
        } else
        {
            error("Invalid variable '" + id + "'");
        }
    },

    gen_set_var: function (id, val)
    {
        var scope = this.current_scope();
        var v     = scope.lookup(id);

        if (v.is_local())
        {
            return this.gen_set_local(id, val);
        } else if (v.is_global())
        {
            return this.gen_set_global(id, val);
        } else if (scope.escaping(id) === v)
        {
            return this.gen_set_escaping(id, val);
        } else if (scope.captured(id) === v)
        {
            return this.gen_set_captured(id, val);
        } else
        {
            error("Invalid variable '" + id + "'");
        }
    },

    gen_get_local:function (id)
    {
        //print("get local '" + id + "' at " + this.stack_offset(id));
        return _op("mov", _mem(this.stack_offset(id), _EBP), _EAX); 
    },

    gen_set_local:function (id, val)
    {
        //print("set local '" + id + "' at " + this.stack_offset(id));
        return [val, _op("mov", _EAX, _mem(this.stack_offset(id), _EBP))];
    },

    gen_get_escaping:function (id)
    {
        //print("get escaping '" + id + "' at offset " + this.stack_offset(id));
        return [
            _op("mov", _mem(this.stack_offset(id), _EBP), _EAX),
            _op("mov", _mem(0, _EAX), _EAX)
        ];
    },

    gen_set_escaping:function (id, val)
    {
        //print("set escaping '" + id + "' at offset " + this.stack_offset(id));
        return [
            _op("mov", _mem(this.stack_offset(id), _EBP), _EAX),
            _op("push", _EAX),
            val,
            _op("pop", _ECX),
            _op("mov", _EAX, _mem(0, _ECX))
        ];
    },

    gen_get_captured:function (id)
    {
        //print("get captured '" + id + "' at offset " + this.closure_offsets[id]);
        return [
            _op("mov", _mem(16, _EBP), _EAX),
            _op("mov", _mem(this.closure_offsets[id], _EAX), _EAX),
            _op("mov", _mem(0, _EAX), _EAX)
        ];

    },

    gen_set_captured:function (id, val)
    {
        //print("set captured '" + id + "' at offset " + this.closure_offsets[id]);
        return [
            _op("mov", _mem(16, _EBP), _EAX),
            _op("mov", _mem(this.closure_offsets[id], _EAX), _EAX),
            _op("push", _EAX),
            val,
            _op("pop", _ECX),
            _op("mov", _EAX, _mem(0, _ECX))
        ];

    }, 

    gen_get_global:function (id)
    {
        return this.gen_send(
                    this.gen_arg(this.gen_mref(photon.global)), 
                    this.gen_symbol("__get__"), 
                    [this.gen_symbol(id)]);

    },

    gen_set_global:function (id, val)
    {

        return this.gen_send(
                    this.gen_arg(this.gen_mref(photon.global)), 
                    this.gen_symbol("__set__"), 
                    [this.gen_symbol(id), val]);
    },

    gen_new_cell:function ()
    {
        return this.gen_send(
                    this.gen_arg(this.gen_mref(photon.cell)),
                    this.gen_symbol("__new__"),
                    []);
    },

    gen_get_cell:function (id)
    {
        var scope = this.current_scope();

        if (scope.escaping(id) !== undefined)
        {
            return _op("mov", _mem(this.stack_offset(id), _EBP), _EAX);
        } else if (scope.captured(id) !== undefined)
        {
            return [
                this.gen_get_clos(),
                _op("mov", _mem(this.closure_offsets[id], _EAX), _EAX)
            ];
        } else
        {
            error("No cell defined in current scope for variable '" + id + "'");
        }
    },

    gen_try_catch:function (t, c, catch_scope)
    {
        print("try_catch");
        var TRY = _label("TRY");
        var END = _label("END");    

        var has_escaping = false;
        for (var id in catch_scope.escaping())
        {
            has_escaping = true;
            break;
        }

        if (has_escaping)
        {
            print("exception escaping");
            var cell_code = [
                this.gen_new_cell(),
                _op("pop", _ECX),
                _op("mov", _ECX, _mem(0, _EAX)),
                _op("push", _EAX)
            ];
        } else
        {
            print("no exception escaping");
            var cell_code = [];
        }

        return [
            _op("call", TRY),

            // CATCH
            this.nop(this.sizeof_ref),
            _op("push", _EAX),
            cell_code,
            c,
            _op("pop", _EAX),
            _op("jmp", END),

            // TRY
            TRY,
            _op("push", _EBP),
            _op("mov", _ESP, _EBP),
            t,
            _op("mov", _EBP, _ESP),
            _op("pop", _EBP),
            _op("add", _$(this.sizeof_ref), _ESP),

            END
        ];
    },

    gen_throw:function (e)
    {
        var LOOP = _label();
        var END  = _label();

        return [
            e,
            _op("push", _EAX),      // Save exception object
            _op("mov", _EBP, _ECX), // Start searching for handler
            LOOP,
            _op("mov", _mem(4, _ECX), _EAX), // Retrieve return address pointer
            _op("cmp", _$(this.nop_cste(4)), _mem(0, _EAX), 32), // Check if it is a handler
            _op("je", END),                  // Yes! jump to handler
            _op("mov", _mem(0, _ECX), _ECX), // No, check next stack frame
            _op("jmp", LOOP),
            END,
            _op("pop", _EAX),       // Restore exception object
            _op("mov", _ECX, _ESP), // Restore stack pointer
            _op("pop", _EBP),       // Restore stack frame
            _op("ret")              // Jump to handler
        ];
    },

    gen_get_this:function ()
    {
        return _op("mov", _mem(this.this_stack_offset(), _EBP), _EAX);
    },

    gen_get_clos:function ()
    {
        return _op("mov", _mem(this.clos_stack_offset(), _EBP), _EAX);
    }
};
