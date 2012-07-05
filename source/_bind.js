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

macro ref_is_constant(r)
{
    return r === undefined || r === null || r === true || r === false;
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

macro header_size()
{
    return @{["number", photon.send(photon.object, "__header_size__") / photon.send(photon.object, "__ref_size__")]}@;
}

function bind(msg, n, rcv, closure)
{
    if (ref_is_fixnum(rcv))
    {
        var l_rcv = @{["ref", photon.fixnum]}@[@-5];
        var l_offset = dynamic_lookup(l_rcv[@-1], msg);
        //var l_offset = static_lookup(l_rcv[@-1], msg);
        //return (l_offset === undefined) ? undefined : 
        return ref_is_fixnum(l_offset) ? l_rcv[@l_offset - header_size()] : l_offset;
    } else if (ref_is_constant(rcv))
    {
        var l_rcv = @{["ref", photon.constant]}@[@-5];
        var l_offset = dynamic_lookup(l_rcv[@-1], msg);
        return ref_is_fixnum(l_offset) ? l_rcv[@l_offset - header_size()] : l_offset;
    } else if (msg === "__lookup__" && rcv === rcv[@-1])
    {
        var l_rcv    = @{["ref", photon.map]}@[@-5];
        var l_offset = 
            @{["ccall",
                  ["ref",    photon.send(photon.map, "__get__", "__lookup__")],
                  ["number", 1],
                  ["ref",    photon.map],
                  ["get", "null"],
                  ["string", "__lookup__"]]}@;
        return (ref_is_fixnum(l_offset)) ? l_rcv[@l_offset - header_size()] : l_offset;
    }



    var l_offset = undefined;
    var l_rcv  = rcv;

    while (l_rcv !== null)
    {
        l_rcv = l_rcv[@-5];

        l_offset = dynamic_lookup(l_rcv[@-1], msg, l_rcv);
        //l_offset = static_lookup(l_rcv[@-1], msg);

        if (l_offset !== undefined)
        {
            return ref_is_fixnum(l_offset) ? l_rcv[@l_offset - header_size()] : l_offset;
        }
        
        l_rcv = l_rcv[@-2];
    }

    throw "send message not understood: '".concat(msg).concat("'");

    return undefined;
}
