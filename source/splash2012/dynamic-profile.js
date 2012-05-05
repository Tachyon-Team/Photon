var count, reset;

function instr_new(f) {
    var counter = 0;

    var g = function () {
        counter++;
        return f.call(this);
    };

    revert = function () {
        return f;
    };

    count = function () {
        return counter;
    };

    return g;
}

Object.prototype.__new__ = instr_new(
    Object.prototype.__new__
);
eval("1+2");
print("Object.prototype.__new__ called " 
    + count() + " times");
Object.prototype.__new__ = revert();
o = {};
