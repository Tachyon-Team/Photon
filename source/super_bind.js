global_return function (msg, n, rcv)
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

            return l_rcv[@l_offset - 4];
        }
        
        l_rcv = l_rcv[@-2];
    }

    return undefined;
}
