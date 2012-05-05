function add(b,a)
{ 
    return String.prototype.__add__.call(a,b);
}

function sub(b,a)
{
    throw "Unimplemented sub handler";
}

function lt(b,a)
{
    a = a.valueOf();
    if (typeof a === "object")
    {
        a = a.toString();
        if (typeof a === "object")
        {
            throw "TypeError: Invalid conversion to primitive value"; 
        }
    }

    b = b.valueOf();
    if (typeof b === "object")
    {
        b = b.toString();
        if (typeof b === "object")
        {
            throw "TypeError: Invalid conversion to primitive value"; 
        }
    }

    if (typeof a === "string" && typeof b === "string")
    {
        return String.prototype.__lt__.call(a,b);
    } else
    {
        return Number.prototype.__lt__.call(a,b);
    }
}
function le(b,a)
{
    a = a.valueOf();
    if (typeof a === "object")
    {
        a = a.toString();
        if (typeof a === "object")
        {
            throw "TypeError: Invalid conversion to primitive value"; 
        }
    }

    b = b.valueOf();
    if (typeof b === "object")
    {
        b = b.toString();
        if (typeof b === "object")
        {
            throw "TypeError: Invalid conversion to primitive value"; 
        }
    }

    if (typeof a === "string" && typeof b === "string")
    {
        return String.prototype.__le__.call(a,b);
    } else
    {
        return Number.prototype.__le__.call(a,b);
    }
}

function gt(b,a)
{
    a = a.valueOf();
    if (typeof a === "object")
    {
        a = a.toString();
        if (typeof a === "object")
        {
            throw "TypeError: Invalid conversion to primitive value"; 
        }
    }

    b = b.valueOf();
    if (typeof b === "object")
    {
        b = b.toString();
        if (typeof b === "object")
        {
            throw "TypeError: Invalid conversion to primitive value"; 
        }
    }

    if (typeof a === "string" && typeof b === "string")
    {
        return String.prototype.__gt__.call(a,b);
    } else
    {
        return Number.prototype.__gt__.call(a,b);
    }
}

function ge(b,a)
{
    a = a.valueOf();
    if (typeof a === "object")
    {
        a = a.toString();
        if (typeof a === "object")
        {
            throw "TypeError: Invalid conversion to primitive value"; 
        }
    }

    b = b.valueOf();
    if (typeof b === "object")
    {
        b = b.toString();
        if (typeof b === "object")
        {
            throw "TypeError: Invalid conversion to primitive value"; 
        }
    }

    if (typeof a === "string" && typeof b === "string")
    {
        return String.prototype.__ge__.call(a,b);
    } else
    {
        return Number.prototype.__ge__.call(a,b);
    }
}
