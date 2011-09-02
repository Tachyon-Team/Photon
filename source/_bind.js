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

global_return function (msg, n, rcv)
{
    if (msg === "__lookup__" && rcv === rcv[@-1])
    {
        var l_rcv    = @{["ref", photon.map]}@;
        var l_offset = 
            @{["ccall",
                  ["ref",    photon.send(photon.map, "__get__", "__lookup__")],
                  ["number", 1],
                  ["ref",    photon.map],
                  ["string", "__lookup__"]]}@;
        return l_rcv[@l_offset - 4];
    }

    if (ref_is_fixnum(rcv))
    {
        var l_rcv = @{["ref", photon.fixnum]}@;
        var l_offset = l_rcv[@-1].__lookup__(msg);
        return (l_offset === undefined) ? undefined : l_rcv[@l_offset - 4];    
    }

    var l_offset = undefined;
    var l_rcv  = rcv;

    while (rcv !== null)
    {
        l_offset = l_rcv[@-1].__lookup__(msg);

        if (l_offset !== undefined)
        {
            return l_rcv[@l_offset - 4];
        }
        
        l_rcv = l_rcv[@-2];
    }

    return undefined;
}
