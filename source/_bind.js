global_return function (msg, n, rcv)
{
    if (msg === "lookup" && rcv === rcv[@-1])
    {
        var l_rcv    = @{["ref", photon.map]}@;
        var l_offset = 
            @{["ccall",
                  ["ref",    photon.send(photon.map, "get", "lookup")],
                  ["number", 1],
                  ["ref",    photon.map],
                  ["string", "lookup"]]}@;
        return l_rcv[@l_offset - 4];
    }

    var l_offset = undefined;
    var l_rcv  = rcv;

    while (rcv !== null)
    {
        //l_offset = l_rcv[@-1].lookup(msg);
        //Static call version
        l_offset = @{["ccall",
                       ["ref",    photon.send(photon.map, "get", "lookup")],
                       ["number", 1],
                       ["gets", ["unop", "-", ["number", 1]], ["get", "l_rcv"]],
                       ["get", "msg"]]}@;

        if (l_offset !== undefined)
        {
            return l_rcv[@l_offset - 4];
        }
        
        l_rcv = l_rcv[@-2];
    }

    return undefined;
}
