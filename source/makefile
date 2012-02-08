#git clone git@github.com:elavoie/ometa-js.git ometa-js

BS_FILES = \
        utility/debug.js \
        utility/num.js \
        utility/misc.js \
        utility/iterators.js \
        utility/arrays.js \
        backend/asm.js \
        backend/x86/asm.js \
        deps/ometa-js/lib.js \
        deps/ometa-js/ometa-base.js \
        deps/ometa-js/parser.js \
        ometa/photon-compiler.js            \
        photon-lib.js \
        photon.js \


BASE_FILES = \
        $(BS_FILES) \
        _bind.js \
        handlers.js \
        super_bind.js \
        photon-stdlib.js \
        stdlib/array.js \
        stdlib/string.js \
        stdlib/math.js \
        photon.js \
        serialize.js

COMPILER_FILES = \
        ometa/photon-compiler.txt

COMPILER_JS_FILES = \
        ometa/photon-compiler.js

JS_FILES  = $(BASE_FILES) $(COMPILER_JS_FILES)

SRC_FILES = $(BASE_FILES) $(COMPILER_FILES)

all: ometa/photon-compiler.js photon

ometa/photon-compiler.js: $(COMPILER_FILES)
	time ./ometa-compile.sh ometa/photon-compiler

main.s: $(JS_FILES) photon-v8
	time ./photon-v8 serialize.js > main.s

photon-v8:
	echo "d8 $(BS_FILES) -- \$$1 \$$2" > photon-v8 && chmod +x photon-v8

photon: main.s 
	time gcc -m32 -g -Wl,-no_pie -segprot __TEXT rwx rwx bootstrap/photon.c main.s -o photon

sloc:
	wc -l $(SRC_FILES)

.PHONY: deps
deps:
	git clone git://github.com/elavoie/ometa-js.git deps/ometa-js

