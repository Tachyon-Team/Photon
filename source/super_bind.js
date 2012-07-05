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

macro header_size()
{
    return @{["number", photon.send(photon.object, "__header_size__") / photon.send(photon.object, "__ref_size__")]}@;
}

function super_bind(msg, n, rcv, closure)
{
    var l_offset = undefined;
    var l_rcv  = rcv;
    var i = 1;

    while (l_rcv !== null)
    {
        l_rcv = l_rcv[@-5];

        l_offset = l_rcv[@-1].__lookup__(msg, l_rcv);

        if (l_offset !== undefined)
        {
            if ((i--) > 0) 
            {
                l_rcv = l_rcv[@-2];
                continue;
            }

            return ref_is_fixnum(l_offset) ? l_rcv[@l_offset - header_size()] : l_offset;
        }
        
        l_rcv = l_rcv[@-2];
    }

    print("super message not understood: ");
    print(msg);

    return undefined;
}
