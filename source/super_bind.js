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

function super_bind(msg, n, rcv, closure)
{
    var l_offset = undefined;
    var l_rcv  = rcv;
    var i = 1;

    while (rcv !== null)
    {
        l_offset = l_rcv[@-1].__lookup__(msg);

        if (l_offset !== undefined)
        {
            if ((i--) > 0) 
            {
                l_rcv = l_rcv[@-2];
                continue;
            }

            return ref_is_fixnum(l_offset) ? l_rcv[@l_offset - 4] : l_offset;
        }
        
        l_rcv = l_rcv[@-2];
    }

    return undefined;
}
