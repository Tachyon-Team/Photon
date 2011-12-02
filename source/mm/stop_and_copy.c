/*
 *  Photon_GC.h
 * 
 *	TODO
 *	
 *	Pile GCProtect pour vars.
 *
 */
 
#include <stdio.h> 
#include <stdlib.h>

typedef long word;
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


#define PAGE_SIZE (32)
#define PAGE_SIZE_B (PAGE_SIZE*sizeof(word))

typedef struct page{
	word * current;
	word * nextfree;
	word * barrier;
	struct page * next;
	struct page * previous;
	int size;
}Page;

typedef struct pile{
	struct pile * previous;
	word ** current;
} Pile;



static Page * memory = NULL, * LOA = NULL, * currentPage, * scanPage;
static word * fromspace, * tospace, * free_mem, * scan;
static word * root[6];
static Pile * gcstack = NULL;
static int rootcount = 0;

//#define GC_PUSH(p) (Pile * temp_PUSH = (Pile *) malloc(sizeof(Pile)); temp_PUSH->previous = gcstack; temp_PUSH->current = p; gcstack = temp_PUSH;)
//#define GC_POP() (word * t_POP = gcstack->current, Pile * p_POP = gcstack, gcstack = gcstack->previous, free(p_POP), t_POP;)


#define GCPRO( var_ref, local_name ) Pile local_name; local_name.current = &var_ref; local_name.previous = gcstack; gcstack = &local_name;
#define UNGCPRO(local_name) ( gcstack = local_name.previous )

/*
word * GC_PUSH(word * p){
	Pile * temp_PUSH = (Pile *) malloc(sizeof(Pile)); 
	temp_PUSH->previous = gcstack; 
	temp_PUSH->current = p; 
	gcstack = temp_PUSH;
	return gcstack->current;
}

word * GC_POP(){
	word * t_POP = gcstack->current;
	Pile * p_POP = gcstack; 
	gcstack = gcstack->previous; 
	free(p_POP); 
	return t_POP;
}
*/

// Imprime l'espace global.
void print_global(){
	printf(" tospace: %d\n fromspace: %d\n free: %d\n currentPage: %d\n nextfree: %d\n memory: %d\n\n", tospace, fromspace, free_mem, currentPage->current,currentPage->nextfree, memory->current);
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
	memory->nextfree = fromspace+PAGE_SIZE-1;
	free_mem = tospace-1;

	// On met tout a 0:
	word * iterator = currentPage->current;
	//printf("current: %d\n",currentPage->current);
	while(iterator < currentPage+PAGE_SIZE){
		*iterator++ = 0;
	}

	//mem_print();
	//printf("mem_init done \n\n");
	return 1;
}

void change_page(Page *);
void add_Page(){

	//printf("\nIn add_Page\n");
	//mem_print();
	Page * p = (Page *) malloc(sizeof(Page));
	//printf("After page Alloc: memory %d\n", memory == NULL);

	//printf("In else: currentPage[0]: %d\n", currentPage->current[PAGE_SIZE/2]);
	currentPage->next = p;
	p->previous = currentPage;
	p->next = NULL;
	//printf("currentPage[0]: %d\n",currentPage->current[PAGE_SIZE/2]);
	// Ne devrait pas etre fait ici.
	//currentPage = p;
	//printf("currentPage[0]: %d\n",currentPage->previous->current[PAGE_SIZE/2]);

	
	//printf("currentPage[0]: %d\n",currentPage->previous->current[PAGE_SIZE/2]);


	// Fix ad-hoc: si la page contenant les données est a droite, flip!.

	// La valeur s'ajoute ici... Who HHO!
	//mem_print();
	p->current = (word *) malloc(PAGE_SIZE_B);
	//printf("After if: current: %d\n", currentPage->current);
	
	//printf("currentPage[0]: %d\n",currentPage->previous->current[PAGE_SIZE/2]);
		
	p->barrier = p->current;
	p->nextfree = p->current+(PAGE_SIZE/2)-1;	
		
		
	change_page(p);
	//mem_print();
	//printf("End add_Page\n\n");
}

void add_LoA(int size) { 
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
	p->size = size;
	LOA=p;
}

// Change le free de page.
void change_page(Page * p){

	//printf("In Change Page \n");
	//print_global();

	// Marche pas. Pointe sur la nouvelle page.
	currentPage->barrier = free_mem+1;
	free_mem = p->nextfree;
	currentPage = p;
	
	if(free_mem == p->current+PAGE_SIZE-1){
		//printf("Free end\n");
		currentPage->nextfree = currentPage->current+PAGE_SIZE/2-1;
		fromspace = p->current+PAGE_SIZE/2;
		tospace = p->current;
	}
	else{
		//printf("Free middle\n");
		currentPage->nextfree = currentPage->current+PAGE_SIZE-1;
		fromspace = p->current;
		tospace = p->current+PAGE_SIZE/2;
	}
	//print_global();
	//printf("End Change Page\n");	
}

word * copy(word * root);
void scanner();

// Enleve les pages redondantes.
void freeLoop(Page * p){
	//printf("freeloop: %d \n", p!=NULL);
	if(p!=NULL){
		freeLoop(p->next);
	
		free(p->current);
		free(p);	
	}
}

void trim_memory(){
	Page * temp;
	//printf("\nIn trim\n");
	if(free_mem-fromspace+1 < PAGE_SIZE/20){
		temp = currentPage->next;
		
	}
	else{
		temp = currentPage;
	}
	//printf("tem: %d \n", temp);
	freeLoop(temp->next);
	currentPage->next = NULL;
	//printf("End Trim\n");
}

// Inverse to et from. 
void flip(word ** root, int rootcount){

	//printf("In Flip\n\n");

	change_page(memory);
	scanPage = memory;
	
	/*
	word * t = fromspace;
	fromspace = tospace;
	tospace = t;
	nextfree = tospace+(PAGE_SIZE/2);
	*/
	
	scan = free_mem;


	// Scan le root
	int i = 0;
	for(i; i< rootcount ; i++){
		root[i] = copy(root[i]);
	}
	// Scan les Gc protected
	Pile * GC_pro = gcstack;
	while(GC_pro != NULL){
		*(GC_pro->current) = copy(*(GC_pro->current));
		GC_pro = GC_pro->previous;
	}
	
	//mem_print();
	scanner();
	//printf("Trim: cur: %d, cur->next: %d\n", currentPage->current, currentPage->next==NULL);
	if(currentPage->next != NULL) trim_memory();
	//printf("End flip\n");
}

// Alloue un bloc de mémoire dans memory/LOA
word * m_alloc(int size){
	
	//printf("\nIn m_alloc\n\n");
	
	//printf("Size: %d \n", size);
	if(size > PAGE_SIZE/2){
		//printf("In LOA\n");
		add_LoA(size);
		return LOA->current;
	}
	
	// Si la prochaine page n'existe pas.
	if(size > (free_mem - fromspace+1) && currentPage->next == NULL){
		//printf("free_mem: %d, fromspace: %d, diff: %d\n", free_mem, fromspace, free_mem-fromspace);

		flip(root, rootcount);
		
		if(size > free_mem - fromspace+1){
			add_Page();
		}
	}
	else if(size > (free_mem - fromspace+1)){
		change_page(currentPage->next);
	}
	
	free_mem -= size;
	//printf("End m_alloc\n");
	return free_mem;
}

// Alloue de la mémoire puis met a jour les valeurs pertinents (td etc).
word * mem_allocate(int sizeL, int sizeR){
	
	//printf("\nIn mem_allocate\n");
	
	word * p = m_alloc(sizeL+sizeR+(sizeR?2:1));
	p += (sizeL+2);
	p[-1] = ((sizeL<<4) + (sizeR<<8));
	if(sizeR) p[sizeR] = I_TO_V(sizeR);
	if((sizeL+sizeR+2)>PAGE_SIZE/2) p[-1]+=(0x10000);
	
	//printf("End mem_allocate\n");
	
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
		printf("\nPage: %u\n", p->current);
		word * pointer = p->current;
		//printf("free: %d\n", free_mem);
		while(pointer < p->current + PAGE_SIZE){
			printf("%u %u\n", pointer ,pointer[0]);
			pointer++;
			if(pointer == p->current + PAGE_SIZE/2) printf("\n");
		}
		p = p->next;
	}
	printf("\nmem_print done \n");
}

// Déplace un objet au nouveau free.
word * move(word * p){
	//printf("In move\n");
	int att = TD_EXTRACT(p[-1]), pay = PAYLOAD(p[-1]), i=0;
	word * w = mem_allocate(att, pay);
	
	if(pay){
		i=pay;
		for(i;i>0;i--) {
			w[i-1] = p[i-1];
			//printf("wi-1: %d\n", w[i-1]);
		}
	}
	for(i;i<=att;i++) w[-i-1] = p[-i-1];
	p[-1] = (((word)w)|0x1);
	//mem_print();
	//printf("End Move\n");
	return w;

}
// Copy l'objet p si ce n'est pas un foreward.
word * copy(word * p){

	// Teste si p est un gros objet.
	if(TEST_LOA(p[-1])) return p;

	//printf("In copy: p:%d, p[-1]: %d\n", p, p[-1]);
	//printf("TEST: %d \n", TEST(p[-1]));
	
	if((TEST(p[-1]))){
		//printf("in if: free: %d, p: %d, p[-1]: %d\n", free_mem, p, p[-1]);
		p = move(p);
	}
	else
		p = (word *) (p[-1] - 0x01);
		
	//printf("End copy\n\n");
	return p;
}

// Scan le tospace pour copier les objets pointés par d'autres objets.
// Revoir la condition d'arret du scan. Changer de page au besoin.
void scanner(){
	int pay_len, i, at_len, fun_len;
	word * p;
	scanPage = memory;
	//printf("\nIn scanner: scan: %d, free: %d, VTOI: %d\n", scan, free_mem, V_TO_I(*scan));
	//printf("scan>free: %d\ncurr==scan: %d, barrier: %d\n", scan>free_mem, currentPage == scanPage, scanPage->barrier);
	
	while((scan > free_mem) || currentPage != scanPage ){
		//printf("In while: \n");
		
		// change scan page as scan reach barrier.
		//printf("TAG : scanPage->current: %d, cond1: %d, cond2: %d, barrier: %d\n", scanPage->current, scanPage != currentPage, scan == scanPage->barrier, scanPage->barrier);
		if(scanPage != currentPage && scan <= scanPage->barrier) {
			//printf("Scan swap: In if: scanPage->next: %d \n",scanPage->next->current);
			scanPage = scanPage->next;
			if(scanPage->nextfree == scanPage->current+PAGE_SIZE-1){
				scan = scanPage->current+PAGE_SIZE/2-1;
			}
			else{
				scan = scanPage->current+PAGE_SIZE-1;
			}
		}		
	
	
		if(!(TEST(*scan))){
			// Case PAYLOAD
			pay_len = V_TO_I(scan[0]); 
			fun_len = FUN_EX(scan[-pay_len-1]);
			
			//printf("*scan: %d\n", *scan);
			//printf("In if: pay_len: %d, fun_len: %d, scan: %d, free: %d\n", pay_len, fun_len, scan, free_mem);
			//printf("\nfun_len: %d\n", fun_len);
			
			if(fun_len){
				//printf("Begin fun\n");
				i = 1;
				word * jump = scan;
				for(i; i<=fun_len; i++){
					jump--;
					p = (word *) scan[-(*jump)-1];
					//printf("Apres scan: p %d, p[0] %d, p[-1] %d\n", p, *p, p[-1]);
					if((TEST(p[-1]))) *jump = (word) copy(p);
					//printf("Apres if: \n");
				}
				scan -= pay_len;
				//printf("End Fun\n");
			}
			else{
				i = 1;
				//printf("in PAYLOAD: scan: %d, free: %d, pay: %d, i: %d\n",scan, free_mem,pay_len, i);

				for(i ; i<= pay_len; i++){
					scan--;
					if(TEST(*scan)){
						p = (word *) *scan;	
						//printf("in for: p: %d, *p: %d \n", p, *p);
						if((TEST(p[-1]))){ 
							*scan = (long)copy(p);
						}
					}
				
				}
				//printf("End if\n");
				//mem_print();
			}
			scan--;
		}
		at_len = TD_EXTRACT(scan[0]);
		//printf("in TD: at_len: %d, scan : %d, free: %d, *scan: %d\n", at_len, scan, free_mem, *scan);
		i=1;
		for(i ; i<=at_len ; i++){
			scan--;
			//printf("\n\n *scan: %d, scan: %d, TEST: %d\n", *scan, scan, TEST(*scan));
			if(TEST(*scan)){
				p =	(word *) *scan;	
				//printf("*p: %d, TEST: %d\n", *p, TEST(p[-1]));
				if((TEST(p[-1]))) *scan = (word)copy(p);
				//printf("p: %d \n",p);
			}
		}
		scan--;
		//mem_print();
		//printf("End While: scan: %d, free: %d \n", scan, free_mem);
	}
	//printf("End Scanner: scan: %d, free: %d \n", scan, free_mem);
}

// Les tests.

// 1. Copie de listes naive.

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
int main(int argc, char ** argv){

	mem_init();
	
	printf("mem_init done\n");
	word * liste = Create_List(5);
	mem_print();
	GCPRO(liste, l2);
	word * var = Copy_List(liste);
	GCPRO(var , cl);
	UNGCPRO(l2);
	mem_print();
	
	flip(root, rootcount);
	mem_print();
	
	//add_Page();

	//flip(root, rootcount);
	//mem_print();
	/*
	word * tree = Gen_Tree();
	//stack_print();
	mem_print();

	//word * tree = 33;
	GCPRO(tree, tree3);
	//stack_print();
	//mem_print();
	printf("Jambon\n");
	//mem_print();
	printf("Eval Tree: %d\n" , evalTree(tree));
	printf("Brebies");
	flip(root,rootcount);
		flip(root,rootcount);
			flip(root,rootcount);
				flip(root,rootcount);
	printf("Eval Tree: %d\n" , evalTree(tree));
	printf("fromage");
	UNGCPRO(tree3);
	flip(root, rootcount);

	*/
	
	mem_print();
	
	printf("End Main\n");
	return 0;
}
