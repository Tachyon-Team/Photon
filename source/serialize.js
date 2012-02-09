function init()
{
    if (this["arguments"].length >= 2)
    {
        print("// executing " + this["arguments"][1]);
        try
        {
            return eval(readFile(this["arguments"][1]));
        } catch (e)
        {
            print("Exception while evaluating:\n" + e);
        }
    }
    else
    {
        print("No file provided");
    }
}
serialize();
