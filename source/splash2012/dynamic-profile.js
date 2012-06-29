
function init() {
    function instr_new(f) {
        var counter = 0;

        var g = function () {
            counter++;
            return f.call(this);
        };

        g.revert = function () {
            return f;
        };

        g.count = function () {
            return counter;
        };

        return g;
    }

    function instr1(f) {
        var counter = 0;

        var g = function (x) {
            counter++;
            return f.call(this, x);
        };

        g.revert = function () {
            return f;
        };

        g.count = function () {
            return counter;
        };

        return g;
    }

    print("Profiling the compiler");
    Object.prototype.__clone_fast__  = instr_new(Object.prototype.__clone_fast__);
    Object.prototype.__new_default__ = instr_new(Object.prototype.__new_default__);
    Object.prototype.__get__         = instr1(Object.prototype.__get__);
    eval("1+2");
    print("__clone_fast__  called " + Object.prototype.__clone_fast__.count() + " times");     
    print("__new_default__ called " + Object.prototype.__new_default__.count() + " times"); 
    print("__get__         called " + Object.prototype.__get__.count() + " times");

    Object.prototype.__clone_fast__  = Object.prototype.__clone_fast__.revert();
    Object.prototype.__new_default__ = Object.prototype.__new_default__.revert();
    Object.prototype.__get__         = Object.prototype.__get__.revert();


    print("Mesuring the overhead of profiling");
    var g = instr1(Object.prototype.__get__);

    var time = currentTimeMillis;
    var o = {foo:42};
    var n = 5000000;

    var start = time();
    for (var i = 0; i < n; ++i)
    {
        o.foo;
    }
    var end = time();
    print("Baseline: " + (end - start) + "s");

    Object.prototype.__get__ = g;

    var start = time();
    for (var i = 0; i < n; ++i)
    {
        o.foo;
    }
    var end = time();
    //print("Performed operations: " + n);
    //print("Profiled  operations: " + g.count());
    print("Profiled: " + (end - start) + "s");

    Object.prototype.__get__ = g.revert();
    var start = time();
    for (var i = 0; i < n; ++i)
    {
        o.foo;
    }
    var end = time();
    print("Reverted: " + (end - start) + "s");

};
init();

//print(eval("1+2"));

//print(Object.prototype.__clone_fast__.count());
//print(Object.prototype.__new_default__.count());
//print(Object.prototype.__get__.count());

//print(eval("1+2"));

//print(eval("1+2"));
/*
print("Object.prototype.__new__ called " 
    + count() + " times");
    */
/*
Object.prototype.__new__ = revert();
*/
//o = {};
