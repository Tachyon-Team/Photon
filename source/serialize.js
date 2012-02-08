function init()
{
    if (this["arguments"].length >= 2)
    {
        print("// executing " + this["arguments"][1]);
        return eval(readFile(this["arguments"][1]));
    }
    else
    {
        print("No file provided");
    }
}
serialize();
