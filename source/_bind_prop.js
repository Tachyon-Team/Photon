global_return function (msg, rcv)
{
    if (msg === "lookup" && rcv === rcv[@-1])
    {
        @{["mreturn", 
            ["ref", photon.map],
            ["call",
                ["ref",    photon.send(photon.map, "get", "lookup")],
                ["ref",    photon.map],
                ["string", "lookup"]]]}@;
    }

    var l_offset = undefined;
    var l_rcv  = rcv;

    while (rcv !== null)
    {
        //l_offset = l_rcv[@-1].lookup(msg);
        //Static call version
        l_offset = @{["call",
                       ["ref",    photon.send(photon.map, "get", "lookup")],
                       ["gets", ["unop", "-", ["number", 1]], ["get", "l_rcv"]],
                       ["get", "msg"]]}@;

        if (l_offset !== undefined)
        {
            @{["mreturn",
                ["get", "l_rcv"],
                ["get", "l_offset"]]}@;
        }
        
        l_rcv = l_rcv[@-2];
    }

    @{["mreturn",
        ["get", "l_rcv"],
        ["get", "l_offset"]]}@;
}
