#git clone git@github.com:elavoie/ometa-js.git ometa-js
SHELL := /bin/bash

UTILITIES = \
        utility/debug.js \
        utility/num.js \
        utility/misc.js \
        utility/iterators.js \
        utility/arrays.js \

X86_BACKEND = \
        backend/asm.js \
        backend/x86/asm.js \

OMETA_RUNTIME = \
        deps/ometa-js/lib.js \
        deps/ometa-js/ometa-base.js \
        deps/ometa-js/parser.js \

OMETA_COMPILER = \
        deps/ometa-js/bs-js-compiler.txt \
        deps/ometa-js/bs-ometa-compiler.txt \
        deps/ometa-js/bs-ometa-optimizer.txt \
        deps/ometa-js/bs-ometa-js-compiler.txt \
        deps/ometa-js/ometa-rhino.js \
        ometa-compiler.js

OMETA_COMPILER_JS_FILES = \
        deps/ometa-js/bs-js-compiler.js \
        deps/ometa-js/bs-ometa-compiler.js \
        deps/ometa-js/bs-ometa-optimizer.js \
        deps/ometa-js/bs-ometa-js-compiler.js \
        deps/ometa-js/ometa-rhino.js \
        ometa-compiler.js



PHOTON = \
        photon-lib.js \
        photon.js

STDLIB_FILES = \
        stdlib/array.js \
        stdlib/string.js \
        stdlib/math.js 

PHOTON_COMPILER_OMETA_FILES = \
        ometa/photon-compiler.txt

PHOTON_COMPILER_JS_FILES = \
        ometa/photon-compiler.js

COMPILER_JS_FILES = \
        ometa/photon-compiler.js \
        ometa/photon-lisp-parser.js \
        ometa/photon-optimizer.js

JS_OPTIMIZATION_FILES = \
        inline.js \
        inline_bind.js \
        get_opt.js \

PHOTON_OPTIMIZER_OMETA_FILES = \
        ometa/photon-optimizer.txt

PHOTON_OPTIMIZER_JS_FILES = \
        ometa/photon-optimizer.js

JS_RUNTIME_FILES = \
        $(STDLIB_FILES) \
        $(UTILITIES) \
        _bind.js \
        handlers.js \
        super_bind.js \
        photon-stdlib.js

REGULAR_FILES = $(UTILITIES) $(X86_BACKEND) $(OMETA_RUNTIME) $(PHOTON) $(STDLIB_FILES)

EXTENDED_FILES = \
        $(JS_OPTIMIZATION_FILES)\
        _bind.js \
        handlers.js \
        super_bind.js \
        photon-stdlib.js

BS_FILES = $(UTILITIES) $(X86_BACKEND) $(OMETA_RUNTIME) $(COMPILER_JS_FILES) $(PHOTON)
JS_FILES  = $(REGULAR_FILES) $(EXTENDED_FILES) $(COMPILER_JS_FILES)

RUNTIME_FILES = bootstrap/photon.c host/d8-tachyon-exts.cc

V8_FILES = host/*.cc host/*.h host/*.c bootstrap/photon.c

all: ometa/photon-compiler.js photon

deps/v8/d8: $(RUNTIME_FILES)
	pushd deps/v8 && scons d8 arch=ia32 && popd

ometa/photon-compiler.js: ometa/photon-compiler.txt
	time ./ometa-compile.sh ometa/photon-compiler

ometa/photon-optimizer.js: ometa/photon-optimizer.txt
	time ./ometa-compile.sh ometa/photon-optimizer

ometa/photon-lisp-parser.js: ometa/photon-lisp-parser.txt
	time ./ometa-compile.sh ometa/photon-lisp-parser

main.s: $(JS_FILES) photon-v8
	time ./photon-v8 serialize.js > main.s

photon-v8: deps/v8/d8 Makefile
	echo "deps/v8/d8 $(BS_FILES) -- \"\$$@\"" > photon-v8 && chmod +x photon-v8

photon: main.s 
	time gcc -m32 -O3 -g -Wl,-no_pie -segprot __TEXT rwx rwx bootstrap/photon.c main.s -o photon

sloc:
	echo "OMeta Compiler"
	cat $(OMETA_COMPILER) | wc -l
	echo "OMeta Runtime"
	./pp.sh $(OMETA_RUNTIME) | wc -l
	echo "Photon Compiler"
	cat <(./pp.sh $(X86_BACKEND) $(PHOTON)) $(PHOTON_COMPILER_OMETA_FILES) | wc -l
	echo "Photon Optimizer"
	cat <(./pp.sh $(JS_OPTIMIZATION_FILES)) $(PHOTON_OPTIMIZATION_OMETA_FILES) | wc -l
	echo "JS Runtime"
	./pp.sh $(JS_RUNTIME_FILES)  | wc -l
	echo "C Runtime"
	cat bootstrap/photon.c | wc -l
	echo "V8 Integration"
	echo "300"
	echo "OMeta Compiler EF"
	cat $(OMETA_COMPILER) | wc -l 
	./pp.sh $(OMETA_COMPILER_JS_FILES) | wc -l 
	echo "Photon Compiler EF"
	cat $(PHOTON_COMPILER_OMETA_FILES) | wc -l 
	./pp.sh $(PHOTON_COMPILER_JS_FILES) | wc -l 
	echo "Photon Optimizer EF"
	cat $(PHOTON_OPTIMIZER_OMETA_FILES) | wc -l 
	./pp.sh $(PHOTON_OPTIMIZER_JS_FILES) | wc -l 
	echo "Regular JS"
	./pp.sh $(REGULAR_FILES) | wc -l 
	echo "Extended JS"
	./pp.sh $(EXTENDED_FILES) | wc -l 


.PHONY: deps
deps:
	git clone git://github.com/elavoie/ometa-js.git deps/ometa-js
	git clone git://github.com/v8/v8.git deps/v8 
	patch deps/v8/SConstruct host/patch/SConstruct.diff
	patch deps/v8/src/SConscript host/patch/SConscript.diff
	patch deps/v8/src/d8.cc host/patch/d8.cc.diff
	pushd deps/v8/src; for i in ../../../host/*.c ../../../host/*.cc ../../../host/*.h ../../../bootstrap/photon.c; do ln -s $$i; done
