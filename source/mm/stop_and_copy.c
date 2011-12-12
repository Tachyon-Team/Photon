/*
 *  Photon_GC.h
 * 
 *	TODO
 *	
 *	
 *
 */
 
#include <stdio.h> 
#include <stdlib.h>
#include <unistd.h>

ssize_t object_prelude_size(struct object *self);
struct object *object_scan(struct object *self);

typedef ssize_t word;
// Macro qui extrait un entier d'un pointer.
#define V_TO_I(x) ((x)>>1)
// Macro int to void *
#define I_TO_V(x) (((x)<<1)|0x01)
// Macro qui teste si un void * est un pointer ou un entier (0 si entier, 1 sinon).
#define TEST(x) ((0x01 & (x))?0:1)
// Renvoi la longueur du payload selon le format 0..0PPPPLLLL000F
// Où F est le flag, L est le nombre d'attribut et P la longueur du payload.
#define PAYLOAD(x) (((x & 0xF00)>>8))
// Macro qui extrait la valeur de TD. 
#define TD_EXTRACT(td) ((td & 0x0F0)>>4)
// Extrait le nombre de pointeurs dans le corps d'une fonction de td.
#define FUN_EX(td) ((td)>>12)
// Test si un objet est dans le large object area.
#define TEST_LOA(p) ((0x010000 & (p))?1:0)
// La taille d'une page en byte.


#define PAGE_SIZE (4096)
#define PAGE_SIZE_B (PAGE_SIZE*sizeof(word))

typedef struct page{
	word * current;
	char * nextfree;
	word * barrier;
	struct page * next;
	struct page * previous;
	//int size;
}Page;

typedef struct pile{
	struct pile * previous;
	word ** current;
} Pile;

static Page * memory = NULL, * LOA = NULL, * currentPage, * scanPage;
static word * fromspace, * tospace, * scan;
static char * free_mem;
static word * root[6];
static Pile * gcstack = NULL;
static int rootcount = 0;

#define GCPRO( var_ref, local_name ) Pile local_name; local_name.current = &var_ref; local_name.previous = gcstack; gcstack = &local_name;
#define UNGCPRO(local_name) ( gcstack = local_name.previous )

// Imprime l'espace global.
void print_global(){
	printf(" tospace: %p\n fromspace: %p\n free: %p\n currentPage: %p\n nextfree: %p\n memory: %p\n\n", tospace, fromspace, free_mem, currentPage->current,currentPage->nextfree, memory->current);
}

void mem_print();
// Genere un block de mémoire.
int mem_init(){
	
	// Initialise la première page.
	Page * p = (Page *) malloc(sizeof(Page));
	p->next = NULL;
	p->previous = NULL;
	currentPage = p;
	memory = currentPage;
	
	currentPage->current = (word *) malloc(PAGE_SIZE_B);
	
	// Initialise les pointeurs.
	fromspace = memory->current;
	tospace = fromspace+(PAGE_SIZE/2);
	memory->nextfree = (char *)(fromspace+PAGE_SIZE-1);
	free_mem = (char *)(tospace-1);

	// On met tout a 0:
	char * iterator = (char *)currentPage->current;
	while(iterator < ((char *)currentPage->current+PAGE_SIZE_B)){
		*iterator++ = 0;
	}
	return 1;
}

void change_page(Page *);
void add_Page(){
	Page * p = (Page *) malloc(sizeof(Page));
	currentPage->next = p;
	p->previous = currentPage;
	p->next = NULL;
	p->current = (word *) malloc(PAGE_SIZE_B);
	p->barrier = p->current;
	p->nextfree = (char *)(p->current+(PAGE_SIZE/2)-1);	
	printf("Add Page: p: %u p->current: %u p->next: %u current->next: %u\n", p, p->current, p->next, currentPage->next);
	change_page(p);
}

void add_LoA(int size) { 
	printf("In LOA\n");
	Page * p = (Page *) malloc(sizeof(Page));
	if(LOA != NULL) {
		LOA->next = p;
		p->previous = LOA;
		p->next = NULL;
	}
	else{
		p->previous = NULL;
		p->next = NULL;
	}
	p->current = (word *) malloc(size);
	p->nextfree = NULL;
	//p->size = size;
	LOA=p;
	printf("End LOA\n");
}

// Change le free de page.
void change_page(Page * p){
	currentPage->barrier = ((word *)free_mem)+1;
	free_mem = p->nextfree;
	currentPage = p;
	
	if(((word *)free_mem) == p->current+PAGE_SIZE-1){
		currentPage->nextfree = (char *)(currentPage->current+PAGE_SIZE/2-1);
		fromspace = p->current+PAGE_SIZE/2;
		tospace = p->current;
	}
	else{
		currentPage->nextfree = (char *)(currentPage->current+PAGE_SIZE-1);
		fromspace = p->current;
		tospace = p->current+PAGE_SIZE/2;
	}	
}

word * copy(word * root);
void scanner();

// Enleve les pages redondantes.
void freeLoop(Page * p){
	if(p!=NULL){
		freeLoop(p->next);
		free(p->current);
		free(p);	
	}
}

void trim_memory(){
	Page * temp;
	if(((word)free_mem)-((word)fromspace)+1 < PAGE_SIZE/20)
		temp = currentPage->next;
	else temp = currentPage;
	freeLoop(temp->next);
	currentPage->next = NULL;
}

// Inverse to et from. 
void flip(){
	change_page(memory);
	scanPage = memory;
	scan = (word *)free_mem;
	// Scan le root array
	/*int i;
	for(i=0; i< rootcount ; i++){
		root[i] = copy(root[i]);
	}
	// Scan les Gc protected
	Pile * GC_pro = gcstack;
	while(GC_pro != NULL){
		*(GC_pro->current) = copy(*(GC_pro->current));
		GC_pro = GC_pro->previous;
	}
	*/
	//scanner();
	//if(currentPage->next != NULL) trim_memory();
}

// Alloue un bloc de mémoire dans memory/LOA
// ToDO ajouter un param avec taille de l'alignement.
char * m_alloc(ssize_t size, ssize_t align = 0, ssize_t gc = 0){
	
	if(size > PAGE_SIZE_B/2){
		printf("Objet trop gros");
		return NULL;
		//add_LoA(size);
		//return (char *)LOA->current;
	}

	// Si la prochaine page n'existe pas.
	if(size > ((word)free_mem - (word)(fromspace-1)) && currentPage->next == NULL){
		//if(gc)flip();
		if(size > ((word)free_mem - (word)(fromspace-1))){
			add_Page();
		}
	}
	else if(size > ((word)free_mem - (word)(fromspace-1))){
		change_page(currentPage->next);
	}
	free_mem -= size;
	free_mem = (char *)((ssize_t)free_mem & -sizeof(ssize_t));
	return free_mem;
}



// Alloue de la mémoire puis met a jour les valeurs pertinents (td etc).
word * mem_allocate(int sizeL, int sizeR){
	
	printf("free_mem: %u\n", free_mem);
	word * p = (word *)m_alloc((sizeL+sizeR+(sizeR?2:1))*sizeof(word));
	p += (sizeL+2);
	p[-1] = ((sizeL<<4) + (sizeR<<8));
	if(sizeR) p[sizeR] = I_TO_V(sizeR);
	if((sizeL+sizeR+2)>PAGE_SIZE/2) p[-1]+=(0x10000);
	printf("free_mem: %u\n", free_mem);
	// Initialise sizeL et sizeR
	int i;
	for(i=0; i<sizeR; i++) p[i] = 0x1;
	for(i=-2; (-i-2)<sizeL; i--) p[i] = 0x1;
	return p;
}

// Imprime le stack.

void stack_print(){
	printf("stack print: \n");
	Pile * ite = gcstack;
	while(ite != NULL){
		printf("%u\n", ite->current);
		ite = ite->previous;
	}
	printf("End stack Print \n");
}

// Imprime la liste de pages:
void LOA_print(){
	printf("In LOA_print\n");
	Page * p = LOA; int count = 0;
	while (p != NULL){
		// Imprime les infos de p.
		printf("\nLOA: %u \naddress: %u \nnext: %u \nprevious: %u \ncurrent: %u\n", count++, p, p->next, p->previous, p->current);
		p = p->previous;
	}
	
}
void page_print(){

	//LOA_print();
	printf("\nIn page_print\n");	
	Page * p = memory; int count = 0;
	while (p != NULL){
		// Imprime les infos de p.
		printf("\nPage: %u \naddress: %p \nnext: %p \nprevious: %p \ncurrent: %p\n", count++, p, p->next, p->previous, p->current);
		p = p->next;
	}
	
}



// Pretty print le block courant.
void mem_print(){
	printf("In mem_print\n");
	Page * p;
	print_global();
	stack_print();
	p = LOA;
	printf("Print LOA: \n");
	if(p == NULL) printf("No LOA \n");
	else{
		while(p != NULL){
			printf("Large Object: %u\n", p->current);
			p = p->previous;
		}
	}
	p = memory;
	printf("Print memory: \n");
	while(p != NULL){
		printf("\nPage: %p\n", p->current);
		word * pointer = p->current;
		while(pointer < p->current + PAGE_SIZE){
			printf("%p %u\n", pointer ,pointer[0]);
			pointer++;
			if(pointer == p->current + PAGE_SIZE/2) printf("\n");
		}
		p = p->next;
	}
	printf("\nmem_print done \n");
}

// Déplace un objet au nouveau free.
word * move(word * p){
	int att = TD_EXTRACT(p[-1]), pay = PAYLOAD(p[-1]), i=0;
	word * w = mem_allocate(att, pay);
	if(pay){
		i=pay;
		for(i;i>0;i--) {
			w[i-1] = p[i-1];
		}
	}
	for(i;i<=att;i++) w[-i-1] = p[-i-1];
	p[-1] = (((word)w)|0x1);
	return w;

}
// Copy l'objet p si ce n'est pas un foreward.
word * copy(word * p){

	// Teste si p est un gros objet.
	if(TEST_LOA(p[-1])) return p;
	
	if((TEST(p[-1]))){
		p = move(p);
	}
	else
		p = (word *) (p[-1] - 0x01);
	return p;
}

// Scan le tospace pour copier les objets pointés par d'autres objets.
void scanner(){
	//int pay_len, i, at_len, fun_len;
	//word * p;
	scanPage = memory;
	
	while((scan > ((word *)free_mem)) || currentPage != scanPage ){
		
		// change scan page as scan reach barrier.
		if(scanPage != currentPage && scan <= scanPage->barrier) {
			scanPage = scanPage->next;
			if(((word *)scanPage->nextfree) == scanPage->current+PAGE_SIZE-1){
				scan = scanPage->current+PAGE_SIZE/2-1;
			}
			else{
				scan = scanPage->current+PAGE_SIZE-1;
			}
		}		
	
		ssize_t size = *((ssize_t *)scan); 
		printf("Scan: size %zd, scan %p, scan[-2] %zd\n", size, scan, scan[-2]);
        scan = (word *)((ssize_t)scan - size);// -sizeof(ssize_t));
	
		object_scan((struct object *)scan);
		
		size = object_prelude_size((struct object *)scan);
		scan = (word *)((ssize_t)scan - sizeof(ssize_t) - size);
	
		/*if(!(TEST(*scan))){
			// Case PAYLOAD
			pay_len = V_TO_I(scan[0]); 
			fun_len = FUN_EX(scan[-pay_len-1]);
			
			if(fun_len){
				word * jump = scan;
				for(i=1; i<=fun_len; i++){
					jump--;
					p = (word *) scan[-(*jump)-1];
					if((TEST(p[-1]))) *jump = (word) copy(p);
				}
				scan -= pay_len;
			}
			else{
				for(i=1 ; i<= pay_len; i++){
					scan--;
					if(TEST(*scan)){
						p = (word *) *scan;	
						if((TEST(p[-1]))){ 
							*scan = (long)copy(p);
						}
					}
				}
			}
			scan--;
		}
		at_len = TD_EXTRACT(scan[0]);
		for(i=1 ; i<=at_len ; i++){
			scan--;
			if(TEST(*scan)){
				p =	(word *) *scan;	
				if((TEST(p[-1]))) *scan = (word)copy(p);
			}
		}
		scan--;
		*/
	}
	
	if(currentPage->next != NULL) trim_memory();
}

// Les tests.

// 1. Copie de listes naive.
/*
word * Create_List(int n){

	printf("Dans Create_List\n");

	word * list = mem_allocate(1, 1); int count = 1;
	list[-2] = 0x1;
	list[0] = count;
	GCPRO(list, list2);
	int i = 0;
	for(i ; i< n ; i++){
		printf("Dans Boucle\n");
		count +=2;
		word * temp = mem_allocate(1,1);
		//GC_PUSH(temp);
		temp[-2] = (word) list;
		temp[0] = count;
		list = temp;
	}
	UNGCPRO(list2);
	return list;
}

// a refaire.
word * Copy_List(word * List){
	printf("Debut Create_List\n");
	word * newList = mem_allocate(1,1);
	newList[0] = List[0]+100;
	//newList[-2] = List[-2];
	GCPRO(newList, nl2);
	word * iterator = newList;
	newList[-2] = iterator;
	GCPRO(iterator, i2);
	word * LoopList = List[-2];
	while(TEST(LoopList[-2])){
		printf("While Create_List\n");
		word * temp = mem_allocate(1, 1);
		temp[0] = LoopList[0]+100;
		temp[-2] = LoopList[-2];
		iterator[-2] = (word)temp;
		iterator = temp;
		LoopList = LoopList[-2];
		
	}
	UNGCPRO(i2);
	UNGCPRO(nl2);
	//newList = iterator;
	printf("Fin Create_List: it %d, nl %d\n", iterator[0], newList[0]);
	return newList;
}
*/

// 2. Arbre arithm. To redo.

char * expr_str = "+1*39";


word * Gen_Tree(){
	
	printf("\nBegin Gen_Tree2\n");
	
	word * tree = mem_allocate(2, 1);
	GCPRO(tree, tree2);
	stack_print();
	printf("Apres GCPRO\n");
	// Les nodes sont de la forme G D TD V
	if(*expr_str >= 48 && *expr_str <=57){

		printf("In if: expr: %c, tree2.current: %u\n", *expr_str, tree[0]);
		
		tree[0] = I_TO_V(*expr_str++);
		tree[-2] = 0x1;
		tree[-3] = 0x1;
	}
	else{
		printf("In else: expr: %c\n", *expr_str);
		tree[0] = I_TO_V(*expr_str++);
		
		tree[-2] = 1;
		tree[-3] = 1; 
		tree[-2] = (word)Gen_Tree();
		printf("In between");
		tree[-3] = (word)Gen_Tree();
	}
	printf("After if\n");
	UNGCPRO(tree2);
	stack_print();
	printf("End Gen_Tree2 \n\n");
	return tree;
}


// Eval tree
word evalTree(word * tree){

	// Parcour l'arbre pour reconstituer l'expression
	// Si valeur, return valeur.
	printf("Tree[0]: %d, %d \n", tree[0], tree[-2]);
	if(tree[0]>=97 && tree[0]<=115) return (V_TO_I(tree[0])-48);
	// Si op: evalTree des enfants puis switch l'op sur les valeurs.
	else{
		word l = evalTree((word*)tree[-2]), r = evalTree((word *)tree[-3]);
		//printf("l: %d, r: %d\n", l, r);
		switch(V_TO_I(tree[0])){
			case '*':
				return l*r;
			case '+':
				return l+r;
			default: 
				return 0;

		}

	}
	return 0;
}

// Main.
/*
int main(int argc, char ** argv){

	mem_init();
	
	printf("mem_init done\n");
	//word * liste = Create_List(5);
	//mem_print();
	//GCPRO(liste, l2);
	//word * var = Copy_List(liste);
	//GCPRO(var , cl);
	//UNGCPRO(l2);
	//mem_print();
	
	//ç(root, rootcount);
	//mem_print();
	//mem_allocate(3,3);
	word * tree = Gen_Tree();
	mem_print();

	GCPRO(tree, tree3);
	printf("Eval Tree: %d\n" , evalTree(tree));
	flip(root,rootcount);
		flip(root,rootcount);
			flip(root,rootcount);
	//			flip(root,rootcount);
	printf("Eval Tree: %d\n" , evalTree(tree));
	UNGCPRO(tree3);
	flip(root, rootcount);
	
	mem_print();
	
	printf("End Main\n");
	return 0;
}
*/
