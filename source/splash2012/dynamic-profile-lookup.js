
function init() {

    var map = @{["ref", photon.map]}@;
    var l = map.__lookup__;

    var flag = true;
    var call_dict = {};
    map.__lookup__ = function (name)
    {
        if (flag)
        {
            flag = false;
            // Prefixing with ' ' to avoid clash with meta-methods
            // which would modify the behavior of call_dict object
            call_dict[" " + name] = true; 
            flag = true;
        }
       
        // Static call defined at compile time
        return @{["ccall",
                    ["ref", photon.send(photon.map, "__get__", "__lookup__")],
                    ["number", 1],
                    ["this"],
                    ["get", "null"],
                    ["get", "name"]]}@;
    };

    // Example code
    for (var i = 0; i < 10; ++i)
    {
        {foo:1, bar:function () {}}.bar();

    }
    // End of example code
    // Stop profiling
    map.__lookup__ = l;


    // Methods called
    print("Methods called:");
    for (var p in call_dict)
    {
        if (call_dict.hasOwnProperty(p))
        {
            print(p);
        }
    }

};
init();
