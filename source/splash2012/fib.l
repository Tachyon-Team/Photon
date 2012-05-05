(var fib (function (n)
    (if (< n 2)
        n
        (+ (fib (- n 1)) (fib (- n 2))))))
(print (fib 40))
//(serialize)
