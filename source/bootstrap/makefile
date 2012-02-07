all: validate

test: test.s
	 gcc -m32 -Wl,-no_pie -segprot __TEXT rwx rwx test.s -o test

run:
	 ./test || echo "return status = $$?"	

photon: photon.c main.c
	 gcc -m32 -g -Wl,-no_pie -segprot __TEXT rwx rwx main.c -o photon

main.s: photon
	 ./photon > main.s

bs-photon: main.s
	 gcc -m32 -g -Wl,-no_pie -segprot __TEXT rwx rwx photon.c main.s -o photon2

bs-main.s: bs-photon
	 ./photon2 > main2.s

bs-photon-2: main2.s
	 gcc -m32 -g -Wl,-no_pie -segprot __TEXT rwx rwx photon.c main2.s -o photon3

bs-main-2.s: bs-photon-2
	 ./photon3 > main3.s

validate: bs-main.s bs-main-2.s
	 diff main2.s main3.s

clean:
	 rm main.s main2.s main3.s photon photon2 photon3
