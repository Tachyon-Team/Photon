macro ref_is_fixnum(r)              
{
    return @{["begin", 
        ["get", "r"],
        ["code",
            [_op("mov", _EAX, _ECX),
             _op("and", _$(1), _ECX),
             _op("mov", _$(_TRUE), _EAX),
             _op("mov", _$(_FALSE), _ECX),
             _op("cmovz", _ECX, _EAX)]]
    ]}@;
}

macro static_lookup(map, msg)
{
    return @{["ccall",
                ["ref",    photon.send(photon.map, "__get__", "__lookup__")],
                ["number", 1],
                ["get", "map"],
                ["get", "null"],
                ["get", "msg"]]}@;
}

macro dynamic_lookup(map, msg)
{
    return map.__lookup__(msg);
}

function bind(msg, n, rcv, closure)
{
    if (ref_is_fixnum(rcv))
    {
        var l_rcv = @{["ref", photon.fixnum]}@;
        var l_offset = dynamic_lookup(l_rcv[@-1], msg);
        //var l_offset = static_lookup(l_rcv[@-1], msg);
        //return (l_offset === undefined) ? undefined : 
        return ref_is_fixnum(l_offset) ? l_rcv[@l_offset - 4] : l_offset;
    } else if (msg === "__lookup__" && rcv === rcv[@-1])
    {
        var l_rcv    = @{["ref", photon.map]}@;
        var l_offset = 
            @{["ccall",
                  ["ref",    photon.send(photon.map, "__get__", "__lookup__")],
                  ["number", 1],
                  ["ref",    photon.map],
                  ["get", "null"],
                  ["string", "__lookup__"]]}@;
        return (ref_is_fixnum(l_offset)) ? l_rcv[@l_offset - 4] : l_offset;
    }



    var l_offset = undefined;
    var l_rcv  = rcv;

    while (rcv !== null)
    {
        l_offset = dynamic_lookup(l_rcv[@-1], msg);
        //l_offset = static_lookup(l_rcv[@-1], msg);

        if (l_offset !== undefined)
        {
            return ref_is_fixnum(l_offset) ? l_rcv[@l_offset - 4] : l_offset;
        }
        
        l_rcv = l_rcv[@-2];
    }

    return undefined;
}