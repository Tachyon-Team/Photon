#! /usr/bin/env gsi -:dar

;; File: "js-proxy.scm"

;; Author: Marc Feeley

;; A web proxy which allows injection of JavaScript code.

;; To use this proxy:
;;
;; 1) Install the Gambit Scheme system (see http://gambit.iro.umontreal.ca)
;;
;; 2) Run the proxy with the command:
;;
;;       % cd photon/source/proxy
;;       % ./js-proxy.scm
;;
;; 3) Configure your browser to use the proxy.  This will depend on your
;;    operating system.  If the proxy is running on the same machine as
;;    the web browser then the proxy is running at "localhost:8000".
;;
;;    On Mac OS X, the proxy setting is in the System Preferences
;;    "Network" panel.  Click "Advanced...", then select the "Proxies"
;;    tab, and check "Web Proxy" then enter the Web Proxy Server address
;;    127.0.0.1 and the port 8000.
;;
;; 4) Visit a web page containing JavaScript code.  Currently this has
;;    only been tested on HTML code containing one <script> tag.
;;
;; 5) The execution profile will appear in the window after a delay
;;    of 5 seconds.  This is a crude way of displaying the profiler
;;    report, but good-enough for now.

(include "htmlprag.scm")

(define proxy-port-number 8000)

(define (proxy-start)
  (let ((server-port
         (open-tcp-server
          (list port-number: proxy-port-number
                eol-encoding: 'cr-lf
                input-buffering: #f))))
    (let loop ()
      (let ((connection (read server-port)))
        (if (not (eof-object? connection))
            (begin
              (thread-start!
               (make-thread
                (lambda ()
                  (proxy-serve connection))))
              (loop)))))))

(define (proxy-read-header connection)
  (let loop ((rev-lines '()))
    (let ((line (read-line connection)))
      (cond ((eof-object? line)
             (print "*** EOF reached on connection\n"))
            ((not (equal? line ""))
             (loop (cons line rev-lines)))
            (else
             (read-u8 connection) ;; read LF of CR-LF sequence (Gambit BUG!)
             (port-settings-set! connection '(input-buffering: #t))
             (reverse rev-lines))))))

(define (proxy-serve connection1)

  (define (extract-host x)
    (has-prefix? x "Host: "))

  (let* ((header
          (proxy-read-header connection1))
         (request
          (call-with-input-string
           (car header)
           (lambda (port)
             (read-all port (lambda (p) (read-line p #\space))))))
         (host-header
          (filter extract-host header))
         (host
          (if (pair? host-header)
              (extract-host (car host-header))
              #f)))

    ;; debugging trace
    (display "@@@ request header:\n")
    (pp header)

    (if (not host)
        (print "*** Host unknown\n")
        (let ((connection2
               (open-tcp-client
                (list port-number: 80
                      server-address: host
                      eol-encoding: 'cr-lf
                      input-buffering: #f))))
          (proxy-handle-request request header connection1 connection2)))))

(define (proxy-handle-request request header connection1 connection2)

  (define (extract-content-encoding x)
    (has-prefix? x "Content-Encoding: "))

  (define (extract-content-length x)
    (has-prefix? x "Content-Length: "))

  (define (extract-content-type x)
    (has-prefix? x "Content-Type: "))

  (define (extract-transfer-encoding x)
    (has-prefix? x "Transfer-Encoding: "))

  (for-each
   (lambda (line)
     (if (not (or (has-prefix? line "Proxy-Connection: ")
                  (has-prefix? line "Accept-Encoding: ")))
         (begin
           #;
           (if (has-prefix? line "Accept: text/html")
               (set! line "Accept: text/html"))
           (display line connection2)
           (newline connection2))))
   header)
  (newline connection2)
  (force-output connection2)

  (let* ((resp-header
          (proxy-read-header connection2))
         (encoding-resp-header
          (filter extract-content-encoding resp-header))
         (content-encoding
          (if (pair? encoding-resp-header)
              (extract-content-encoding (car encoding-resp-header))
              #f))
         (length-resp-header
          (filter extract-content-length resp-header))
         (content-length
          (if (pair? length-resp-header)
              (string->number (extract-content-length (car length-resp-header)))
              #f))
         (type-resp-header
          (filter extract-content-type resp-header))
         (content-type
          (if (pair? type-resp-header)
              (extract-content-type (car type-resp-header))
              #f))
         (transfer-encoding-resp-header
          (filter extract-transfer-encoding resp-header))
         (transfer-encoding
          (if (pair? transfer-encoding-resp-header)
              (extract-transfer-encoding (car transfer-encoding-resp-header))
              #f)))
          
    (define (respond content)
      (for-each
       (lambda (line)
         (if (extract-content-length line)
             (display (string-append "Content-Length: " (number->string (u8vector-length content))) connection1)
             (display line connection1))
         (newline connection1))
       resp-header)
      (newline connection1)
      (write-subu8vector content 0 (u8vector-length content) connection1))

    #;
    (cond ((equal? transfer-encoding "chunked")
           (pp '(tttttttttttttttttttttt chunked)))
          ((equal? transfer-encoding "compress")
           (pp '(tttttttttttttttttttttt compress)))
          ((equal? transfer-encoding "deflate")
           (pp '(tttttttttttttttttttttt deflate)))
          ((equal? transfer-encoding "gzip")
           (pp '(tttttttttttttttttttttt gzip)))
          ((equal? transfer-encoding "identity")
           (pp '(tttttttttttttttttttttt identity)))
          ((equal? transfer-encoding #f)
           (pp '(tttttttttttttttttttttt #f)))
          (else
           (error "unknown transfer encoding")))
          
    (let ((content
           (cond ((equal? transfer-encoding "chunked")
                  (read-chunked connection2))

                 (content-length
                  (let ((content (make-u8vector content-length)))
                    (read-subu8vector content 0 content-length connection2)
                    content))

                 (else
                  (read-until-pause connection2)))))

      (define (content-string)
        (call-with-input-u8vector
         (list init: content
               eol-encoding: 'lf ;;;;;;;;;;;'cr-lf
               char-encoding: 'UTF-8)
         (lambda (p)
           (let ((x (read-line p #f)))
             (if (eof-object? x)
                 ""
                 x)))))

      (define (default)
        (respond content))

      (define (filter-js)
        (display "****************JS******************\n")
        (respond-with
         (js-rewrite "js" 'script (content-string))))

      (define (respond-with x)
        (let ((v (with-output-to-u8vector
                  (list eol-encoding: 'lf ;;;;;;;;;;;;;;;;'cr-lf
                        char-encoding: 'UTF-8)
                  (lambda () (display x)))))
          (respond v)))

      (define (filter-html)
        (display "****************XML/HTML******************\n")
        (let ((new-html (transform-html (content-string))))
          (respond-with new-html)))

      (if content-type

          (cond ((or (has-prefix? content-type "application/x-javascript")
                     (has-prefix? content-type "text/javascript"))
                 (filter-js))

                ((or ;;(has-prefix? content-type "application/xml")
                     (has-prefix? content-type "text/html"))
                 (filter-html))

                (else
                 (default)))

          (default))
      )

    (with-exception-catcher
     (lambda (e)
       0)
     (lambda ()
       (close-port connection1)))

    (with-exception-catcher
     (lambda (e)
       0)
     (lambda ()
       (close-port connection2)))))

(define (read-chunked connection)
  (let ((port (open-output-u8vector)))
    (let loop1 ()
      (let loop2 ((n 0))
        (let ((x (read-u8 connection)))
          (if (eof-object? x)
              (error "EOF reached")
              (let ((d (string->number (string (integer->char x)) 16)))
                (if d
                    (loop2 (+ d (* n 16)))
                    (let loop3 ()
                      (let ((x (read-u8 connection)))
                        (if (eof-object? x)
                            (error "EOF reached")
                            (if (not (= x 10))
                                (loop3)
                                (if (= n 0)
                                    (get-output-u8vector port)
                                    (let ((buf (make-u8vector n)))
                                      (read-subu8vector buf 0 n connection)
                                      (read-u8 connection) ;; cr
                                      (read-u8 connection) ;; lf
                                      (write-subu8vector buf 0 n port)
                                      (loop1)))))))))))))))

(define (read-until-pause connection)
  (let ((buf (make-u8vector 10000))
        (port (open-output-u8vector)))
    (let loop ()
      (input-port-timeout-set! connection 0.3) ;; don't wait for more than 0.3 sec
      (let ((len
             (with-exception-catcher
              (lambda (e)
                0)
              (lambda ()
                (read-subu8vector buf 0 (u8vector-length buf) connection)))))
        (if (> len 0)
            (begin
              (write-subu8vector buf 0 len port)
              (loop))
            (begin
              (input-port-timeout-set! connection #f)
              (get-output-u8vector port)))))))

(define (filter keep? lst)
  (cond ((not (pair? lst))
         '())
        ((keep? (car lst))
         (cons (car lst) (filter keep? (cdr lst))))
        (else
         (filter keep? (cdr lst)))))

(define (has-prefix? str prefix)
  (let ((len-str (string-length str))
        (len-prefix (string-length prefix)))
    (and (>= len-str len-prefix)
         (string=? (substring str 0 len-prefix) prefix)
         (substring str len-prefix len-str))))

(define (has-ws-prefix? str prefix)
  (let ((len-str (string-length str))
        (len-prefix (string-length prefix)))
    (let loop ((i 0))
      (if (and (< i len-str) (char-whitespace? (string-ref str i)))
          (loop (+ i 1))
          (and (>= len-str (+ i len-prefix))
               (string=? (substring str i (+ i len-prefix)) prefix)
               (substring str (+ i len-prefix) len-str))))))

(define (transform-html html)
  (let* ((shtml (html->shtml html))
         (edits (js-edits shtml)))
    (let ((result (edit-string html edits)))
      ;;(display "***************************************\n")
      ;;(display result)
      result)))

(define filename-counter 0)

(define (js-rewrite location type text)
  (set! text (string-append text "\n")) ;; work around "unexpected end-of-file" JS parser bug
  (set! filename-counter (+ filename-counter 1))
  (let ((filename
         (string-append
          location
          "-"
          (symbol->string type)
          "-"
          (number->string filename-counter)
          ".js")))
    (with-output-to-file filename (lambda () (display text)))
    (let ((status
           (process-status
            (open-process
             (list path: "../parser/js2js"
                   arguments: (list "-debug" "-js" filename))))))
      (let ((rewritten-text
             (if (not (= 0 status))
                 (begin
                   ;; show any code that could not be processed by js2js
                   (display "--------------------- error while processing:\n")
                   (display text)
                   (newline)
                   text)
                 (call-with-input-file
                     (string-append filename ".js")
                   (lambda (p)
                     (read-line p #f))))))
        rewritten-text))))

(define (js-edits shtml)

  (define rev-edits '())

  (define (cvt x)
    (if (pair? x)
        (let ((tag (car x)))
          (if (and (pair? (cdr x))
                   (pair? (cadr x))
                   (eq? (car (cadr x)) '@))
              (cvt-aux tag (cdr (cadr x)) (cddr x))
              (cvt-aux tag #f (cdr x))))
        x))

  (define (cvt-aux tag attribs body)
    (gen tag
         (and attribs (cvt-attribs attribs))
         (if (and (eq? tag 'script)
                  (or (not attribs)
                      (not (assoc 'type attribs))
                      (equal? (assoc 'type attribs)
                              '(type "text/javascript"))))
             (cvt-script-body body)
             (map cvt body))))

  (define (gen tag attribs body)
    (if attribs
        (cons tag
              (cons (cons '@ attribs)
                    body))
        (cons tag
              body)))

  (define (cvt-attribs attribs)
    (cons (car attribs)
          (map (lambda (a)
                 (let ((type (car a)))
                   (if (pair? (cdr a))
                       (let ((val (cadr a)))
                         (list type (cvt-attrib type val)))
                       (list type))))
               (cdr attribs))))

  (define (cvt-attrib type val)
    (if (memq type html-events)
        (cvt-event type val)
        val))

  (define (cvt-event type val)
    (let* ((text (vector-ref val 0))
           (start (vector-ref val 1))
           (end (vector-ref val 2))
           (edit
            (vector (cvt-script text)
                    start
                    end
                    type)))
      #;(set! rev-edits (cons edit rev-edits))
      edit))

  (define (cvt-script-body lst)
    (if (null? lst)
        '()
        (let* ((first (car lst))
               (last (car (reverse lst)))
               (text (append-strings
                      (map (lambda (x) (vector-ref x 0)) lst)))
               (edit
                (vector (cvt-script text)
                        (vector-ref first 1)
                        (vector-ref last 2)
                        'script)))
          (set! rev-edits (cons edit rev-edits))
          (list edit))))

  (define (cvt-script text)
    (js-rewrite "html" 'script (or (has-ws-prefix? text "<!--") text)))

  (cvt shtml)

  (reverse rev-edits))

(define (edit-string str edits)

  (define (edit x port)
    (let ((replacement (vector-ref x 0))
          (start-pos (vector-ref x 1))
          (end-pos (vector-ref x 2)))
      (skip-to start-pos port #t)
      (skip-to end-pos port #f)
      (display replacement)))

  (define (skip-to pos port keep?)
    (let loop1 ()
      (if (< (input-port-line port) (car pos))
          (let ((line (read-line port #\newline #t)))
            (if keep? (display line))
            (loop1))
          (let loop2 ()
            (if (< (input-port-column port) (cdr pos))
                (let ((c (read-char port)))
                  (if keep? (write-char c))
                  (loop2)))))))

  (with-output-to-string
    ""
    (lambda ()
      (call-with-input-string
       str
       (lambda (port)
         (for-each (lambda (x) (edit x port)) edits)
         (let ((rest (read-line port #f)))
           (if (not (eof-object? rest))
               (display rest))))))))

(define html-events '(

onload
onunload

onblur
onchange
onfocus
onreset
onselect
onsubmit

onabort

onkeydown
onkeypress
onkeyup

onclick
ondblclick
onmousedown
onmousemove
onmouseout
onmouseover
onmouseup

))

(proxy-start)
