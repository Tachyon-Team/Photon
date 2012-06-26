SHELL := /bin/bash

JS_VM = ../deps/v8/d8

BS_FILES = \
        ../utility/debug.js \
        ../utility/num.js \
        ../utility/misc.js \
        ../utility/iterators.js \
        ../utility/arrays.js \
        ../backend/asm.js \
        ../backend/x86/asm.js \
        ../deps/ometa-js/lib.js \
        ../deps/ometa-js/ometa-base.js \
        ../deps/ometa-js/parser.js \
        ../ometa/photon-compiler.js \
        ../ometa/photon-optimizer.js \
        ../ometa/photon-lisp-parser.js \
        ../photon-lib.js

STDLIB_FILES = \
        ../stdlib/array.js \
        ../stdlib/string.js \
        ../stdlib/math.js

CREATE_EXEC = /usr/bin/gcc -m32 -O3 -g -Wl,-no_pie -segprot __TEXT rwx rwx ../bootstrap/photon.c

PRECOMPILED_NOIC = \
    bin/cfr-noic \
    bin/nsieve-noic \
    bin/fannkuch-noic \
    bin/fannkuch-nostring-noic \
    bin/tree-noic \
    bin/tree-clone-noic

PRECOMPILED = \
    bin/cfr \
    bin/nsieve \
    bin/fannkuch \
    bin/fannkuch-nostring \
    bin/tree bin/tree-clone



all: map dynamic-profile static-profile fib-lisp

../ometa/photon-compiler.js: ../ometa/photon-compiler.txt
	pushd ../ && time ./ometa-compile.sh ./ometa/photon-compiler && popd

../ometa/photon-optimizer.js: ../ometa/photon-optimizer.txt
	pushd ../ && time ./ometa-compile.sh ./ometa/photon-optimizer && popd

../ometa/photon-lisp-parser.js: ../ometa/photon-lisp-parser.txt
	pudhd ../ && time ./ometa-compile.sh ./ometa/photon-lisp-parser && popd

../deps/v8/d8: ../bootstrap/photon.c ../host/d8-tachyon-exts.cc
	pushd ../deps/v8 && scons d8 arch=ia32 && popd

obj/main.s: $(BS_FILES) $(STDLIB_FILES) ../inline.js ../get_opt.js ../serialize.js ../photon.js ../deps/v8/d8
	$(JS_VM) $(BS_FILES) photon.js -- $(STDLIB_FILES) $(BS_FILES) ../inline.js ../get_opt.js ../serialize.js > obj/main.s

bin/photon:  obj/main.s ../bootstrap/photon.c
	time $(CREATE_EXEC) obj/main.s -o bin/photon 

obj/main-noic.s: $(BS_FILES) $(STDLIB_FILES) ../serialize.js ../photon.js
	$(JS_VM) $(BS_FILES) photon.js -- -noic $(STDLIB_FILES) $(BS_FILES) ../serialize.js > obj/main-noic.s

bin/photon-noic:  obj/main-noic.s
	time $(CREATE_EXEC) obj/main-noic.s -o bin/photon-noic

map:
	echo "JS Map implementation" &&\
    time $(JS_VM) $(BS_FILES) photon.js -- ../utility/debug.js harmony-map.js map-test.js &&\
    echo "Native Map implementation" &&\
	time $(JS_VM) $(BS_FILES) photon.js -- ../utility/debug.js harmony-map-native.js map-test.js

dynamic-profile: bin/photon
	bin/photon dynamic-profile.js

static-profile: bin/photon
	bin/photon static-profile.js

main-lisp.s: bin/photon
	time bin/photon morph.js serialize.l > obj/main-lisp.s

photon-lisp: obj/main-lisp.s
	time $(CREATE_EXEC) obj/main-lisp.s -o bin/photon-lisp 

fib-lisp: bin/photon-lisp
	bin/photon-lisp fib.l

obj/cfr.s: benchmarks/controlflow-recursive.js bin/photon
	bin/photon benchmarks/controlflow-recursive.js serialize.js > obj/cfr.s

bin/cfr: obj/cfr.s
	$(CREATE_EXEC) obj/cfr.s -o bin/cfr

obj/cfr-noic.s: benchmarks/controlflow-recursive.js bin/photon-noic
	bin/photon-noic benchmarks/controlflow-recursive.js serialize.js > obj/cfr-noic.s

bin/cfr-noic: obj/cfr-noic.s
	$(CREATE_EXEC) obj/cfr-noic.s -o bin/cfr-noic

obj/nsieve.s: benchmarks/access-nsieve.js bin/photon
	bin/photon benchmarks/access-nsieve.js serialize.js > obj/nsieve.s

bin/nsieve: obj/nsieve.s
	$(CREATE_EXEC) obj/nsieve.s -o bin/nsieve

obj/nsieve-noic.s: benchmarks/access-nsieve.js bin/photon-noic
	bin/photon-noic benchmarks/access-nsieve.js serialize.js > obj/nsieve-noic.s

bin/nsieve-noic: obj/nsieve-noic.s
	$(CREATE_EXEC) obj/nsieve-noic.s -o bin/nsieve-noic

obj/fannkuch.s: benchmarks/access-fannkuch.js bin/photon
	bin/photon benchmarks/access-fannkuch.js serialize.js > obj/fannkuch.s

bin/fannkuch: obj/fannkuch.s
	$(CREATE_EXEC) obj/fannkuch.s -o bin/fannkuch

obj/fannkuch-noic.s: benchmarks/access-fannkuch.js bin/photon-noic
	bin/photon-noic benchmarks/access-fannkuch.js serialize.js > obj/fannkuch-noic.s

bin/fannkuch-noic: obj/fannkuch-noic.s
	$(CREATE_EXEC) obj/fannkuch-noic.s -o bin/fannkuch-noic

obj/fannkuch-nostring.s: benchmarks/access-fannkuch-nostring.js bin/photon
	bin/photon benchmarks/access-fannkuch-nostring.js serialize.js > obj/fannkuch-nostring.s

bin/fannkuch-nostring: obj/fannkuch-nostring.s
	$(CREATE_EXEC) obj/fannkuch-nostring.s -o bin/fannkuch-nostring

obj/fannkuch-nostring-noic.s: benchmarks/access-fannkuch-nostring.js bin/photon-noic
	bin/photon-noic benchmarks/access-fannkuch-nostring.js serialize.js > obj/fannkuch-nostring-noic.s

bin/fannkuch-nostring-noic: obj/fannkuch-nostring-noic.s
	$(CREATE_EXEC) obj/fannkuch-nostring-noic.s -o bin/fannkuch-nostring-noic

obj/tree.s: benchmarks/access-binary-tree.js bin/photon
	bin/photon benchmarks/access-binary-tree.js serialize.js > obj/tree.s

bin/tree: obj/tree.s
	$(CREATE_EXEC) obj/tree.s -o bin/tree

obj/tree-noic.s: benchmarks/access-binary-tree.js bin/photon-noic
	bin/photon-noic benchmarks/access-binary-tree.js serialize.js > obj/tree-noic.s

bin/tree-noic: obj/tree-noic.s
	$(CREATE_EXEC) obj/tree-noic.s -o bin/tree-noic

obj/tree-clone.s: benchmarks/access-binary-tree-clone.js bin/photon
	bin/photon benchmarks/access-binary-tree-clone.js serialize.js > obj/tree-clone.s

bin/tree-clone: obj/tree-clone.s
	$(CREATE_EXEC) obj/tree-clone.s -o bin/tree-clone

obj/tree-clone-noic.s: benchmarks/access-binary-tree-clone.js bin/photon-noic
	bin/photon-noic benchmarks/access-binary-tree-clone.js serialize.js > obj/tree-clone-noic.s

bin/tree-clone-noic: obj/tree-clone-noic.s
	$(CREATE_EXEC) obj/tree-clone-noic.s -o bin/tree-clone-noic

obj/creation.s: benchmarks/creation.js bin/photon
	bin/photon benchmarks/creation.js serialize.js > obj/creation.s

bin/creation: obj/creation.s
	$(CREATE_EXEC) obj/creation.s -o bin/creation

NODE_NB = 4000000
perf-creation: bin/creation
	time bin/creation -- $(NODE_NB)
	time $(JS_VM) benchmarks/creation.js init.js -- $(NODE_NB)

IC_NB = 400
perf: $(PRECOMPILED) 
	time bin/cfr -- $(IC_NB)
	time $(JS_VM) benchmarks/controlflow-recursive.js init.js -- $(IC_NB)
	time bin/nsieve -- $(IC_NB)
	time $(JS_VM) benchmarks/access-nsieve.js init.js -- $(IC_NB)
	time bin/fannkuch -- $(IC_NB)
	time $(JS_VM) benchmarks/access-fannkuch.js init.js -- $(IC_NB)
	time bin/fannkuch-nostring -- $(IC_NB)
	time $(JS_VM) benchmarks/access-fannkuch-nostring.js init.js -- $(IC_NB)
	time bin/tree -- $(IC_NB)
	time bin/tree-clone -- $(IC_NB)
	time $(JS_VM) benchmarks/access-binary-tree.js init.js -- $(IC_NB)

NOIC_NB = 40
perf-noic: $(PRECOMPILED_NOIC) $(PRECOMPILED)
	time bin/cfr -- $(NOIC_NB)
	time bin/cfr-noic -- $(NOIC_NB)
	time bin/nsieve -- $(NOIC_NB)
	time bin/nsieve-noic -- $(NOIC_NB)
	time bin/fannkuch -- $(NOIC_NB)
	time bin/fannkuch-noic -- $(NOIC_NB)
	time bin/fannkuch-nostring -- $(NOIC_NB)
	time bin/fannkuch-nostring-noic -- $(NOIC_NB)
	time bin/tree -- $(NOIC_NB)
	time bin/tree-noic -- $(NOIC_NB)
	time bin/tree-clone -- $(NOIC_NB)
	time bin/tree-clone-noic -- $(NOIC_NB)


COMP_TIME_FILE = benchmarks/controlflow-recursive.js benchmarks/access-nsieve.js
comp-time: comp_time.js bin/photon bin/photon-noic 
	time $(JS_VM) $(BS_FILES) photon.js -- -report $(COMP_TIME_FILE)
	bin/photon comp_time.js -- $(COMP_TIME_FILE)
	bin/photon-noic comp_time.js -- $(COMP_TIME_FILE)

clean:
	rm -rf bin/*
	rm obj/*

