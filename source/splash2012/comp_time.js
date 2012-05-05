for (var i = 0; i < arguments.length; ++i)
{
    perfBuckets = {};
    eval_instr(readFile(arguments[i]));
    reportPerformance();
}
