var revert;

function instr_gen_send(f)
{
    var g = function (nb, rcv, msg, args, bind_helper)
    {
        print("Generating send '" + msg + "'");
        return f.call(this, nb, rcv, msg, args, bind_helper);
    }

    revert = function ()
    {
        return f;
    };

    return g;
}
PhotonCompiler.context.gen_send = instr_gen_send(
    PhotonCompiler.context.gen_send
);
eval("function fib(n) {" +
         "if (n<2) return n;" +
         "return fib(n-1)+fib(n-2); " +
     "}");
print(fib(10));
PhotonCompiler.context.gen_send = revert();

