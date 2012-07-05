/**  Copyright Erick Lavoie **/
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/time.h>
#include <assert.h>

#ifndef _PHOTON_H
#define _PHOTON_H

#define GC_UNUSED_SYMBOLS
#define ACTUALLY_GC_UNUSED_SYMBOLS

#define DEBUG_GC_TRACES

#define DEBUG_GC

#define PROFILE_GC_TRACES

#define HEAP_PTR_IN_REG_not

#ifdef HEAP_PTR_IN_REG

register char *heap_ptr asm ("esi");

#else

char *heap_ptr = 0;

#endif // HEAP_PTR_IN_REG


#if defined(PROFILE_GC_TRACES)
    ssize_t total_gc_time = 0;
#endif

/*
 * The PP_NARG macro evaluates to the number of arguments that have been
 * passed to it.
 *
 * Laurent Deniau, "__VA_NARG__," 17 January 2006, <comp.std.c> (29 November 2007).
 */
#define PHOTON_PP_NARG(...) \
         PHOTON_PP_NARG_(__VA_ARGS__,PHOTON_PP_RSEQ_N()) 
#define PHOTON_PP_NARG_(...) \
         PHOTON_PP_ARG_N(__VA_ARGS__) 
#define PHOTON_PP_ARG_N( \
          _1, _2, _3, _4, _5, _6, _7, _8, _9,_10, \
         _11,_12,_13,_14,_15,_16,_17,_18,_19,_20, \
         _21,_22,_23,_24,_25,_26,_27,_28,_29,_30, \
         _31,_32,_33,_34,_35,_36,_37,_38,_39,_40, \
         _41,_42,_43,_44,_45,_46,_47,_48,_49,_50, \
         _51,_52,_53,_54,_55,_56,_57,_58,_59,_60, \
         _61,_62,_63,N,...) N 
#define PHOTON_PP_RSEQ_N() \
         63,62,61,60,                   \
         59,58,57,56,55,54,53,52,51,50, \
         49,48,47,46,45,44,43,42,41,40, \
         39,38,37,36,35,34,33,32,31,30, \
         29,28,27,26,25,24,23,22,21,20, \
         19,18,17,16,15,14,13,12,11,10, \
         9,8,7,6,5,4,3,2,1,0

#ifndef CURRENT_TIME_MILLIS
#define CURRENT_TIME_MILLIS
// Timer initialization time
double photonTimerInitTime;

// Last time value returned by the timer
double photonTimerLastTime;

double photonCurrentTimeSecs()
{
    struct timeval timeVal;

    int r = gettimeofday(&timeVal, NULL);

    if (r != 0)
    {
        printf("Error in getTimeSecs\n");
        exit(0);
    }

    double curTime = (timeVal.tv_sec + timeVal.tv_usec / 1000000.0);

    double deltaTime = curTime - photonTimerInitTime;

    //printf("// cur time  : %f\n", curTime);
    //printf("// init time : %f\n", photonTimerInitTime);
    //printf("// delta time: %f\n", deltaTime);

    // If the clock value is updated, avoid returning
    // a time smaller than the last value
    if (deltaTime < photonTimerLastTime)
    {
        return photonTimerLastTime;
    }

    photonTimerLastTime = deltaTime;

    return deltaTime;
}

ssize_t photonCurrentTimeMillis()
{
    double timeSecs = photonCurrentTimeSecs();

    //printf("// Time secs: %f\n", timeSecs);

    ssize_t timeMs = (ssize_t)(timeSecs * 1000);

    return timeMs;
}
#endif // #ifndef CURRENT_TIME_MILLIS

void initTimer()
{
    // Initialize the timer
    photonTimerInitTime = 0;
    photonTimerInitTime = photonCurrentTimeSecs();
    photonTimerLastTime = 0;
}

struct array;
struct cell;
struct frame;
struct function;
struct header;
struct lookup;
struct map;
struct object;
struct property;
struct symbol;

typedef struct object *(*method_t)(size_t n, struct object *receiver, struct object *closure, ...);

//--------------------------------- Inner Object Layouts -----------------------
#define COUNT_BIT_NB 16
struct header {
    struct object     *values[0];
    struct object     *values_size;
    struct object     *extension;
    struct object     *flags;
    struct object     *payload_size;
    struct object     *prototype;
    struct map        *map;
};

struct property {
    struct object     *name;
    struct object     *location;
    struct object     *value_cache;
    struct object     *location_cache;
    ssize_t           obj_offset;
    ssize_t           obj_offset2;
};

//--------------------------------- Object Layouts -----------------------------
struct array {
    struct header      _hd[0];
    struct object     *count;
    struct object     *indexed_values[0];
};

struct cell {
    struct header      _hd[0];
    struct object*     value;
};

struct frame {
    struct header      _hd[0];
    struct object     *n;
    struct object     *self;
    struct function   *closure;
    struct object     *arguments[0];
};

struct function {
    struct header      _hd[0];
    unsigned char      code[0];
};

struct lookup {
    struct object     *rcv;
    struct object     *offset;
};

struct map {
    struct header      _hd[0];
    struct object     *type;
    struct object     *count;
    struct object     *next_offset;
    struct object     *next_name;
    struct object     *next_map;
    struct object     *cache;
    struct object     *new_map;
    struct property    properties[0];
};

struct object {
    struct header      _hd[0];
};

struct symbol {
    struct header      _hd[0];
    unsigned char      string[0];
};

//--------------------------------- Root Objects ------------------------------
struct object *global_object      = (struct object *)0;
struct object *roots              = (struct object *)0;
struct object *roots_names        = (struct object *)0;
struct object *root_arguments     = (struct object *)0;
struct object *root_array         = (struct object *)0;
struct object *root_cell          = (struct object *)0;
struct object *root_constant      = (struct object *)0;
struct object *root_cwrapper      = (struct object *)0;
struct object *root_fixnum        = (struct object *)0;
struct object *root_frame         = (struct object *)0;
struct object *root_function      = (struct object *)0;
struct object *root_map           = (struct object *)0;
struct object *root_object        = (struct object *)0;
struct object *root_symbol        = (struct object *)0;
struct object *symbol_table       = (struct object *)0;

size_t mem_arguments              = 0;
size_t mem_array                  = 0;
size_t mem_cell                   = 0;
size_t mem_frame                  = 0;
size_t mem_function               = 0;
size_t mem_map                    = 0;
size_t mem_object                 = 0;
size_t mem_symbol                 = 0;

struct object *RESERVED      = (struct object *)10;
struct object *FALSE         = (struct object *)4;
// NULL renamed to NIL to avoid conflicts with some NULL definitions in C
struct object *NIL           = (struct object *)2;
struct object *TRUE          = (struct object *)6;
struct object *UNDEFINED     = (struct object *)0;

struct object *s_add         = (struct object *)0;
struct object *s_allocate    = (struct object *)0;
struct object *s_clone       = (struct object *)0;
struct object *s_create      = (struct object *)0;
struct object *s_delete      = (struct object *)0;
struct object *s_get         = (struct object *)0;
struct object *s_get_cell    = (struct object *)0;
struct object *s_init        = (struct object *)0;
struct object *s_intern      = (struct object *)0;
struct object *s_length      = (struct object *)0;
struct object *s_lookup      = (struct object *)0;
struct object *s_new         = (struct object *)0;
struct object *s_prototype   = (struct object *)0;
struct object *s_push        = (struct object *)0;
struct object *s_remove      = (struct object *)0;
struct object *s_set         = (struct object *)0;
struct object *s_set_cell    = (struct object *)0;
struct object *s_symbols     = (struct object *)0;

struct object *s_base_map                     = (struct object *)0;
struct object *s_hasOwnProperty               = (struct object *)0;
struct object *s_lookup_and_flush_all         = (struct object *)0;
struct object *s_lookup_and_flush_value_cache = (struct object *)0;

struct object *ARRAY_TYPE    = (struct object *)0;
struct object *CELL_TYPE     = (struct object *)0;
struct object *FIXNUM_TYPE   = (struct object *)0;
struct object *FRAME_TYPE    = (struct object *)0;
struct object *FUNCTION_TYPE = (struct object *)0;
struct object *MAP_TYPE      = (struct object *)0;
struct object *OBJECT_TYPE   = (struct object *)0;
struct object *SYMBOL_TYPE   = (struct object *)0;

#define TEMPS_SIZE 2
struct object *temps[TEMPS_SIZE];

ssize_t BOOTSTRAP = 0;



//--------------------------------- Helper Functions ---------------------------
inline ssize_t fx(struct object *obj);
inline ssize_t object_values_count(struct object *self);
inline ssize_t object_values_size(struct object *self);
inline struct object *ref(ssize_t i);
inline ssize_t ref_to_fixnum(struct object *obj);

inline ssize_t array_indexed_values_size(struct array *self)
{
    return (fx(self->_hd[-1].payload_size) - sizeof(struct array)) /
        sizeof(struct object *);
}

inline struct object *fixnum_to_ref(ssize_t i)
{
    return (struct object *)((i << 1) + 1);
}

inline ssize_t fx(struct object *obj)
{
    return ref_to_fixnum(obj);
}

inline ssize_t map_properties_count(struct map *self)
{
    return fx(self->count);
}

inline ssize_t map_properties_size(struct map *self)
{
    return (fx(self->_hd[-1].payload_size) - sizeof(struct map)) /
        sizeof(struct property);
}

inline ssize_t map_values_are_immutable(struct map *self)
{
    return fx(self->_hd[-1].flags) & 0x10000;
}

inline ssize_t map_values_count(struct map *self)
{
    return object_values_count((struct object *)self);
}

void map_values_set_immutable(struct map *self)
{
    self->_hd[-1].flags = ref(fx(self->_hd[-1].flags) | 0x10000);
}

inline ssize_t max(ssize_t a, ssize_t b)
{
    return (a > b) ? a : b;
}

#define PAYLOAD_TYPE_OFFSET ((COUNT_BIT_NB + 3))
#define PAYLOAD_MASK       (3 << PAYLOAD_TYPE_OFFSET)
#define BINARY_PAYLOAD     (0 << PAYLOAD_TYPE_OFFSET) 
#define HYBRID_PAYLOAD     (1 << PAYLOAD_TYPE_OFFSET)
#define STRUCTURED_PAYLOAD (2 << PAYLOAD_TYPE_OFFSET)
#define CUSTOM_PAYLOAD     (3 << PAYLOAD_TYPE_OFFSET)

#define GC_FORWARDED  (1 << (COUNT_BIT_NB + 5))
#define GC_WEAK_REFS  (1 << (COUNT_BIT_NB + 6))
#define OBJ_TAGGED    (1 << (COUNT_BIT_NB + 2))

inline ssize_t object_payload_type(struct object *self)
{
    return fx(self->_hd[-1].flags) & PAYLOAD_MASK;
}

inline void object_payload_type_set_binary(struct object *self)
{
  self->_hd[-1].flags = ref((fx(self->_hd[-1].flags) & ~PAYLOAD_MASK) | BINARY_PAYLOAD);
}

inline void object_payload_type_set_hybrid(struct object *self)
{
  self->_hd[-1].flags = ref((fx(self->_hd[-1].flags) & ~PAYLOAD_MASK) | HYBRID_PAYLOAD);
}

inline void object_payload_type_set_structured(struct object *self)
{
  self->_hd[-1].flags = ref((fx(self->_hd[-1].flags) & ~PAYLOAD_MASK) | STRUCTURED_PAYLOAD);
}

inline void object_payload_type_set_custom(struct object *self)
{
  self->_hd[-1].flags = ref((fx(self->_hd[-1].flags) & ~PAYLOAD_MASK) | CUSTOM_PAYLOAD);
}

inline ssize_t object_prelude_size(struct object *self)
{
    return sizeof(struct header) + object_values_size(self)*sizeof(struct object *);
}

inline ssize_t object_tagged(struct object *self)
{
    return fx(self->_hd[-1].flags) & (1<<(COUNT_BIT_NB + 2));
}

inline void object_tag(struct object *self)
{
    self->_hd[-1].flags = ref(fx(self->_hd[-1].flags) | (1<<(COUNT_BIT_NB + 2)));
}

inline ssize_t object_flag_get(struct object *self, ssize_t mask)
{
    return fx(self->_hd[-1].flags) & mask;
}

inline void object_flag_set(struct object *self, ssize_t mask)
{
    self->_hd[-1].flags = ref(fx(self->_hd[-1].flags) | mask);
}

inline void object_flag_unset(struct object *self, ssize_t mask)
{
    self->_hd[-1].flags = ref(fx(self->_hd[-1].flags) & ~mask);
}


inline ssize_t object_values_count(struct object *self)
{
    //return fx(self->_hd[-1].flags) & 255;
    return fx(self->_hd[-1].flags) & ((1<<COUNT_BIT_NB) - 1);
}

inline void object_values_count_dec(struct object *self)
{
    self->_hd[-1].flags = ref(fx(self->_hd[-1].flags) - 1);
}

inline void object_values_count_inc(struct object *self)
{
    assert(object_values_count(self) < (1<<COUNT_BIT_NB)); 
    self->_hd[-1].flags = ref(fx(self->_hd[-1].flags) + 1);
}

inline void object_values_count_set(struct object *self, size_t count)
{
    //self->_hd[-1].flags = ref((fx(self->_hd[-1].flags) & -256) | (count & 255));
    self->_hd[-1].flags = ref((fx(self->_hd[-1].flags) & -(1<<COUNT_BIT_NB)) | count & ((1<<COUNT_BIT_NB)-1));
}

inline ssize_t object_values_size(struct object *self)
{
    //return (fx(self->_hd[-1].flags) & 0xFF00) >> 8;
    return fx(self->_hd[-1].values_size);
}

inline void object_values_size_set(struct object *self, size_t size)
{
    //assert(size < 256); 

    //self->_hd[-1].flags = ref((fx(self->_hd[-1].flags) & (-65281)) | 
    //    ((size & 255) << 8));
    self->_hd[-1].values_size = ref(size);
}

inline struct object *ref(ssize_t i)
{
    return fixnum_to_ref(i);
}

inline ssize_t ref_is_constant(struct object *obj)
{
    return obj == UNDEFINED || obj == NIL || obj == TRUE || obj == FALSE;
}

inline ssize_t ref_is_fixnum(struct object *obj)
{
    return ((size_t)obj & 1) == 1;
}

inline ssize_t ref_is_object(struct object *obj)
{
    return ((size_t)obj & 1) == 0;
}

inline ssize_t ref_to_fixnum(struct object *obj)
{
    return (ssize_t)obj >> 1;
}

inline char byte(ssize_t i, struct object *obj)
{
    return (char)(((size_t)obj >> i*8) & 0xff);
}

//--------------------------------- Memory Allocation Primitives ---------------
inline ssize_t ref_is_object(struct object *obj);


char *static_heap_start = 0;
char *static_heap_end   = 0;

char *heap_start = 0;
char *heap_mid   = 0;
char *heap_end   = 0;
char *heap_limit = 0;
unsigned long long mem_allocated = 0;      // in Bytes
unsigned long long exec_mem_allocated = 0; // in Bytes

#define MB (1024*1024)
#define HEAP_SIZE (64 * MB)
#define HEAP_FUDGE MB

extern void newHeap()
{
    //assert(heap_start == 0); // only allocate one heap

    //heap_start = (char *)calloc(1, HEAP_SIZE);
    heap_start = (char *)mmap(
        0,
        HEAP_SIZE,
        PROT_READ | PROT_WRITE | PROT_EXEC,
        MAP_PRIVATE | MAP_ANON,
        -1,
        0
    );

    assert(heap_start != MAP_FAILED);

    heap_mid = heap_start + HEAP_SIZE/2;
    heap_end = heap_start + HEAP_SIZE;
    heap_limit = heap_mid + HEAP_FUDGE;
    heap_ptr = heap_end;
    //printf("// heap_start = %p, heap_limit = %p, heap_ptr = %p\n", heap_start, heap_limit, heap_ptr);
}

//size_t maxsize = 0;

void garbage_collect();
struct object *garbage_collect_live(struct object *live);

inline char *raw_calloc(size_t nb, size_t size)
{
    // Align size
    size_t obj_size = (nb * size + (sizeof(ssize_t) - 1)) & (-(sizeof(ssize_t)));
    char *new_ptr = (char *)0;
    mem_allocated += obj_size;

    //    if (obj_size > maxsize)
    //      { maxsize = obj_size; fprintf(stderr, "maxsize=%d\n", (int)maxsize); }/////////////

    if (obj_size > HEAP_FUDGE)
    {
        new_ptr = (char *)calloc(1, obj_size);
        assert(new_ptr != 0);

#if defined(DEBUG_GC_TRACES) || 1
            fprintf(stderr, "*** calloc called from raw_calloc!\n");
#endif

        return new_ptr;
    } else
    {
        heap_ptr -= obj_size;
        new_ptr = heap_ptr;

        if (heap_ptr < heap_limit)
        {
#if defined(DEBUG_GC_TRACES) || 1
            fprintf(stderr, "*** garbage collecting from raw_calloc! obj_size=%d\n", (int)obj_size);
#endif

            // Dummy object initialization
            struct object *dummy        = (struct object *)(heap_ptr + sizeof(struct header));
            struct object *payload_size = fixnum_to_ref(obj_size - sizeof(struct header));

            dummy->_hd[-1].values_size  = fixnum_to_ref(0);
            dummy->_hd[-1].extension    = dummy;
            dummy->_hd[-1].flags        = fixnum_to_ref(BINARY_PAYLOAD);
            dummy->_hd[-1].payload_size = payload_size;
            dummy->_hd[-1].prototype    = UNDEFINED;
            dummy->_hd[-1].map          = (struct map *)UNDEFINED;

            new_ptr = (char*)garbage_collect_live(dummy) - sizeof(struct header);
        }

        assert(heap_ptr >= heap_limit && heap_ptr <= heap_start + HEAP_SIZE);
    }

    assert(heap_ptr >= heap_limit && heap_ptr <= heap_start + HEAP_SIZE);
    return new_ptr;
}

#define inc_mem_counter(COUNTER, props, payload)\
(                                               \
    COUNTER += props*sizeof(struct object *) +  \
               sizeof(struct header)         +  \
               payload                          \
)                                                


//-------------------------------- Memory management ---------------------------

struct object *todo[1000000];
int todo_ptr;
int todo_scan;
int todo_scan_at_end_of_pass1;

struct gcprot_cell { struct object *obj; struct gcprot_cell *next; };

#define GCPROTBEGIN(name) struct gcprot_cell name ## _gcprot_cell; name ## _gcprot_cell.obj = UNDEFINED; name ## _gcprot_cell.next = gcprot_head; gcprot_head = &name ## _gcprot_cell

#define GCPROTEND(name) gcprot_head = name ## _gcprot_cell.next

#define GCPROT(name) name ## _gcprot_cell.obj

struct gcprot_cell *gcprot_head = NULL;

char *fromspace_start = 0;
char *fromspace_end   = 0;

int with_payload = 0;
int without_payload = 0;

void copy_object(struct object **obj)
{
  struct object *o = *obj;

  assert(o->_hd[-1].extension == o);

  assert(ref_is_fixnum(o->_hd[-1].values_size)); // NOT forwarded yet!

  ssize_t values_size = fx(o->_hd[-1].values_size);
  ssize_t object_prelude_size = values_size * sizeof(struct object *) + sizeof(struct header);
  ssize_t object_size = (object_prelude_size + fx(o->_hd[-1].payload_size) + sizeof(struct object *) - 1) & -sizeof(struct object *);

#ifdef DEBUG_GC_TRACES
  if (o != *obj)
    fprintf(stderr, "(*obj)->_hd[-1].extension != *obj   %p  %p\n", o, *obj);
#endif

   {
      struct object *copy;

      ssize_t payload_len = object_size - object_prelude_size;

      if (payload_len > 0)
        with_payload++;
      else
        without_payload++;

      //TODO: if this is a big object it should be allocated with calloc
      heap_ptr -= object_size + sizeof(struct object *);

      copy = (struct object *)(heap_ptr + object_prelude_size);

      // TODO: Should compact unused slots in objects
      ssize_t i = 0;
      for (i = -fx(o->_hd[-1].values_size); i < 0; ++i)
      {
          copy->_hd[-1].values[i]   = o->_hd[-1].values[i];
      }

      copy->_hd[-1].values_size   = o->_hd[-1].values_size;
      copy->_hd[-1].extension     = o;
      copy->_hd[-1].flags         = o->_hd[-1].flags;
      copy->_hd[-1].payload_size  = o->_hd[-1].payload_size;
      copy->_hd[-1].prototype     = o->_hd[-1].prototype;
      copy->_hd[-1].map           = o->_hd[-1].map;

#ifdef DEBUG_GC_TRACES
      assert((ssize_t)abs(((ssize_t)copy - (ssize_t)o)) > payload_len); // Make sure that memory zones do not overlap
#endif

      // copy payload
      memcpy((void *)copy, (void *)o, payload_len);

      *(struct object **)((char *)copy + payload_len) = fixnum_to_ref(payload_len);

      *obj = copy;
    }
}

void forward(const char *msg, struct object **obj)
{
  struct object *o = *obj;

  if (o == UNDEFINED)
    {
#ifdef DEBUG_GC_TRACES
      fprintf(stderr, "%s %p: UNDEFINED\n", msg, o);
#endif
    }
  else if (o == NIL)
    {
#ifdef DEBUG_GC_TRACES
      fprintf(stderr, "%s %p: NIL\n", msg, o);
#endif
    }
  else if (o == TRUE)
    {
#ifdef DEBUG_GC_TRACES
      fprintf(stderr, "%s %p: TRUE\n", msg, o);
#endif
    }
  else if (o == FALSE)
    {
#ifdef DEBUG_GC_TRACES
      fprintf(stderr, "%s %p: FALSE\n", msg, o);
#endif
    }
  else if (ref_is_fixnum(o))
    {
#ifdef DEBUG_GC_TRACES
      fprintf(stderr, "%s %p: FIXNUM (%d)\n", msg, o, (int)ref_to_fixnum(o));
#endif
    }
  else if ((int)o < 1024) // TODO: remove this check for strange address
    {
#ifdef DEBUG_GC_TRACES
      fprintf(stderr, "%s %p: STRANGE ADDRESS!\n", msg, o);
#endif
      assert(1 == 0);
    }
  else
  {
#if 0
    if (ref_is_fixnum(o->_hd[-1].values_size)) // not forwarded yet
      {
#endif

        struct object *e = o->_hd[-1].extension;

        assert(e->_hd[-1].extension == e);

        if (ref_is_fixnum(e->_hd[-1].values_size)) // extension not forwarded yet
        {
#ifdef DEBUG_GC_TRACES

            fprintf(stderr, "%s %p: MEMORY ALLOCATED OBJECT #%d\n", msg, o, todo_ptr);

#endif

            if (((char *)o >= heap_start && (char *)o <= heap_end) || // movable?
                e != o) // must replace object by its extension?
              {

#ifdef DEBUG_GC_TRACES
                fprintf(stderr, "COPYING %p MEMORY ALLOCATED OBJECT %d\n", o, todo_ptr);
#endif
                copy_object(&e);
              }

            e->_hd[-1].extension->_hd[-1].values_size = (struct object *)((ref_to_fixnum(e->_hd[-1].values_size)<<16)+(todo_ptr<<1)); // leave forwarding pointer
            object_flag_set(e, GC_FORWARDED);
            todo[todo_ptr++] = e;

            *obj = e;
         } else
         {
#ifdef DEBUG_GC_TRACES
            fprintf(stderr, "%s %p: FORWARDED MEMORY ALLOCATED OBJECT #%d\n", msg, o, ((int)(e->_hd[-1].values_size) & ~(-1<<16)) >> 1);
#endif
            *obj = todo[(((int)(e->_hd[-1].values_size) & ~(-1<<16)) >> 1)];
         }
      }
#if 0
    else
      {
#ifdef DEBUG_GC_TRACES
        fprintf(stderr, "%s %p: FORWARDED MEMORY ALLOCATED OBJECT #%d\n", msg, o, ((int)(o->_hd[-1].values_size) & ~(-1<<16)) >> 1);
#endif
        *obj = todo[(((int)(o->_hd[-1].values_size) & ~(-1<<16)) >> 1)];
      }
  }
#endif
}

int forward_weak(const char *msg, struct object **obj)
{
  struct object *o = *obj;

  if (o == UNDEFINED)
    {
#ifdef DEBUG_GC_TRACES
      fprintf(stderr, "%s %p: UNDEFINED\n", msg, o);
#endif
    }
  else if (o == NIL)
    {
#ifdef DEBUG_GC_TRACES
      fprintf(stderr, "%s %p: NIL\n", msg, o);
#endif
    }
  else if (o == TRUE)
    {
#ifdef DEBUG_GC_TRACES
      fprintf(stderr, "%s %p: TRUE\n", msg, o);
#endif
    }
  else if (o == FALSE)
    {
#ifdef DEBUG_GC_TRACES
      fprintf(stderr, "%s %p: FALSE\n", msg, o);
#endif
    }
  else if (ref_is_fixnum(o))
    {
#ifdef DEBUG_GC_TRACES
      fprintf(stderr, "%s %p: FIXNUM (%d)\n", msg, o, (int)ref_to_fixnum(o));
#endif
    }
  else
  {
    struct object *e = o->_hd[-1].extension;

    assert(e->_hd[-1].extension == e);

    if (ref_is_fixnum(e->_hd[-1].values_size)) // not forwarded yet
      {
        // this code assumes that only symbol table arrays are weak

#if defined(DEBUG_GC_TRACES) || 0
        fprintf(stderr, "%s %p: WEAK REF TO UNFORWARDED MEMORY ALLOCATED OBJECT %s\n", msg, o, (char *)o);
#endif

#ifdef ACTUALLY_GC_UNUSED_SYMBOLS
        *obj = ref(0); // replace original reference by fixnum 0
        return 1; // a weak reference was removed from its container
#else
        forward(msg, obj);
        return 0;
#endif
      }
    else
      {
#ifdef DEBUG_GC_TRACES
        fprintf(stderr, "%s %p: FORWARDED MEMORY ALLOCATED OBJECT #%d\n", msg, o, ((int)(e->_hd[-1].values_size) & ~(-1<<16)) >> 1);
#endif
        *obj = todo[(((int)(e->_hd[-1].values_size) & ~(-1<<16)) >> 1)];
      }
  }

  return 0;
}

void forward_multiple(const char *msg, struct object **obj, int n)
{
  while (n-- > 0)
    {
      forward(msg, obj);
      obj++;
    }
}

void forward_indirect(const char* msg, struct object **cache)
{
    if (*cache == NIL)
    {
#ifdef DEBUG_GC_TRACES
      fprintf(stderr, "%s %p: NIL\n", msg, cache);
#endif
      return;
    }

    ssize_t offset = ((ssize_t *)*cache)[2];
#ifdef DEBUG_GC_TRACES
    fprintf(stderr, "%s %p: NEXT     %p\n", msg, cache, ((void **)*cache)[0]);
    fprintf(stderr, "%s %p: PREVIOUS %p\n", msg, cache, ((void **)*cache)[1]);
    fprintf(stderr, "%s %p: OFFSET   %zd\n", msg, cache, offset);
#endif
    struct object *obj = (struct object *)((char *)(*cache) - offset);

#if 0 
    ssize_t i;
    for (i=-6; i<=0; ++i)
    {
      fprintf(stderr, "%p : %p %s\n", &((struct object **)obj)[i], ((struct object **)obj)[i], (i==0)?"*":" ");
    }
      //fprintf(stderr, "%s %p: OLD OBJECT %p\n", msg, cache, obj);
#endif

    forward("FORWARDING %p", &obj);
    *cache = (struct object *)(((char *)obj) + offset);
}

void scan(struct object *o)
{
  struct map *m;

#ifdef DEBUG_GC_TRACES
  fprintf(stderr, "\nSCANNING %p MEMORY ALLOCATED OBJECT #%d\n", o, todo_scan);
#endif

  struct object *vs = o->_hd[-1].values_size;
  // Objects from the static heap have a forwarding pointer but copied objects do not
  ssize_t n = ref_is_fixnum(vs) ? fx(o->_hd[-1].values_size) : ((ssize_t)o->_hd[-1].values_size) >> 16;
  vs = fixnum_to_ref(n);

  ssize_t i;
  for (i=-n; i < 0; ++i)
  {
    forward("    values[i]", &o->_hd[-1].values[i]);
  }

  forward("  values_size", &vs);
  forward("    extension", &o->_hd[-1].extension);
  forward("        flags", &o->_hd[-1].flags);
  forward(" payload_size", &o->_hd[-1].payload_size);
  forward("          map", (struct object **)&o->_hd[-1].map);
  forward("    prototype", &o->_hd[-1].prototype);

#ifdef DEBUG_GC_TRACES
  //for (i=0; i<fx(o->_hd[-1].payload_size); i++)
  //  fprintf(stderr, "  %02x\n", ((unsigned char *)o)[i]);
#endif

  //  fprintf(stderr,"payload_type=%d\n",(int)object_payload_type(o));

  switch (object_payload_type(o))
    {
    case HYBRID_PAYLOAD:
      {
        int ps = fx(o->_hd[-1].payload_size);
        struct object **p = (struct object **)((char *)o + ps);
        int n = fx(*--p);

        int op_offset        = 6;
        int next_offset      = 14;
        int previous_offset  = next_offset + 4;

#if 0
        for (i=0; i<fx(o->_hd[-1].payload_size); i++)
          fprintf(stderr, "  %02x\n", ((unsigned char *)o)[i]);
#endif

        while (n-- > 0)
        {
            int offs = fx(*--p);
            if (offs < 0)
            {
#if 0
              fprintf(stderr, "offs = %d\n", offs);
#endif
                // The inline cache is invalid if the map is undefined
                char *cache = (char *)o - offs;
                if ((*((struct object **)cache)) == UNDEFINED)
                    continue;

                forward("       map",(struct object **)cache);

                if (*(cache + op_offset) == (char)0xb8)
                {
                    forward("    method",(struct object **)(cache + op_offset + 1));
                }

                forward_indirect("      next",(struct object **)(cache + next_offset));
                forward_indirect("  previous",(struct object **)(cache + previous_offset));
            }
            else
                forward("  ref",(struct object **)((char *)o + offs));
        }

#if 0
        fprintf(stderr, "\n");
#endif

        break;
      }

    case BINARY_PAYLOAD:
      // Nothing to do
      break;
    case STRUCTURED_PAYLOAD:

#ifdef GC_UNUSED_SYMBOLS

      if (object_flag_get(o, GC_WEAK_REFS))
        {
          // this code assumes that only symbol table arrays are weak

#ifdef DEBUG_GC_TRACES
          fprintf(stderr, "PASS 2 : SCANNING %p MEMORY ALLOCATED WEAK OBJECT #%d\n", o, todo_scan);
#endif

          fprintf(stderr, "nb_syms before = %d\n", fx(((struct object **)o)[0]));/////////////////////////

          for (i=(fx(o->_hd[-1].payload_size)/sizeof(struct object *)) - 1; i >= 0; --i)
            {
              if (forward_weak("    payload[i]", &(((struct object **)o)[i])))
                {
                  // remove one symbol from symbol table array
#if 0
                  // TODO: decreasing the number of symbols causes a bug, so don't do it for now (which means the symbol table will never shrink)
                  ssize_t nb_syms = fx(((struct object **)o)[0]);
                  ((struct object **)o)[0] = ref(nb_syms-1);
#endif
                }
            }

          fprintf(stderr, "nb_syms after = %d\n", fx(((struct object **)o)[0]));/////////////////////////
        }
      else

#endif

        {
          for (i=(fx(o->_hd[-1].payload_size)/sizeof(struct object *)) - 1; i >= 0; --i)
            {
              forward("    payload[i]", &(((struct object **)o)[i]));
            }
        }
      break;
    case CUSTOM_PAYLOAD:
      m = (struct map *)o;
      forward(             "          map type", &m->type);
      forward(             "         map count", &m->count);
      forward(             "   map next offset", &m->next_offset);
      forward(             "     map next_name", &m->next_name);
      forward(             "      map next_map", &m->next_map);
      forward(             "         map cache", &m->cache);
      forward(             "       map new_map", &m->new_map);

      for (i=0; i < fx(m->count); ++i)
      {
#if 0
          if (ref_is_fixnum(m->properties[i].name))
          {
              fprintf(stderr,  "       map prop name: %zd\n", fx(m->properties[i].name));
          } else
          {
              fprintf(stderr,  "       map prop name: %s\n", (char *)m->properties[i].name);
          }
#endif
          forward(         "       map prop name", &m->properties[i].name);
          forward(         "       map prop loc ", &m->properties[i].location);
          forward_indirect("  map prop val cache", &m->properties[i].value_cache);
          forward_indirect("  map prop loc cache", &m->properties[i].location_cache);
      }
      break;
    }
}

void forward_roots()
{
  forward("                  global_object", &global_object);
  forward("                          roots", &roots);
  forward("                    roots_names", &roots_names);
  forward("                 root_arguments", &root_arguments);
  forward("                     root_array", &root_array);
  forward("                      root_cell", &root_cell);
  forward("                  root_constant", &root_constant);
  forward("                  root_cwrapper", &root_cwrapper);
  forward("                    root_fixnum", &root_fixnum);
  forward("                     root_frame", &root_frame);
  forward("                  root_function", &root_function);
  forward("                       root_map", &root_map);
  forward("                    root_object", &root_object);
  forward("                    root_symbol", &root_symbol);
  forward("                   symbol_table", &symbol_table);
  //  forward("                       RESERVED", &RESERVED);
  forward("                          FALSE", &FALSE);
  forward("                            NIL", &NIL);
  forward("                           TRUE", &TRUE);
  forward("                      UNDEFINED", &UNDEFINED);
  forward("                          s_add", &s_add);
  forward("                     s_allocate", &s_allocate);
  forward("                        s_clone", &s_clone);
  forward("                       s_create", &s_create);
  forward("                       s_delete", &s_delete);
  forward("                          s_get", &s_get);
  forward("                     s_get_cell", &s_get_cell);
  forward("                         s_init", &s_init);
  forward("                       s_intern", &s_intern);
  forward("                       s_length", &s_length);
  forward("                       s_lookup", &s_lookup);
  forward("                          s_new", &s_new);
  forward("                    s_prototype", &s_prototype);
  forward("                         s_push", &s_push);
  forward("                       s_remove", &s_remove);
  forward("                          s_set", &s_set);
  forward("                     s_set_cell", &s_set_cell);
  forward("                      s_symbols", &s_symbols);
  forward("                     s_base_map", &s_base_map);
  forward("               s_hasOwnProperty", &s_hasOwnProperty);
  forward("         s_lookup_and_flush_all", &s_lookup_and_flush_all);
  forward(" s_lookup_and_flush_value_cache", &s_lookup_and_flush_value_cache);
  forward("                     ARRAY_TYPE", &ARRAY_TYPE);
  forward("                      CELL_TYPE", &CELL_TYPE);
  forward("                    FIXNUM_TYPE", &FIXNUM_TYPE);
  forward("                     FRAME_TYPE", &FRAME_TYPE);
  forward("                  FUNCTION_TYPE", &FUNCTION_TYPE);
  forward("                       MAP_TYPE", &MAP_TYPE);
  forward("                    OBJECT_TYPE", &OBJECT_TYPE);
  forward("                    SYMBOL_TYPE", &SYMBOL_TYPE);

  forward_multiple(
          "                          TEMPS", temps, TEMPS_SIZE);
}

void *main_frame = NULL; // pointer to main's frame (so we know when to stop walking the stack frames)

void forward_return_address(void **ra_slot)
{
  void *ra = *ra_slot;
  long dist = *(long *)((char *)ra + 2);
  struct object *container_fn = (struct object *)((char *)ra - dist);

#ifdef DEBUG_GC_TRACES
  fprintf(stderr,"  return address = %p     container_fn = %p     dist = %d\n", ra, container_fn, (int)dist);
#endif

  forward("  container_fn", &container_fn);

  *ra_slot = (void *)((char *)container_fn + dist); // update return address
}

void forward_stack()
{
  void *ebp;
  asm("movl %%ebp,%0" : "=r"(ebp));

  void **frame = (void**)ebp;
  void **next_frame;
  char *ra;

  while (frame != main_frame)
    {
      next_frame = (void**)frame[0];
      ra = (char *)frame[1];
      if ((ra >= heap_start && ra < heap_end) ||
          (ra >= static_heap_start && ra < static_heap_end))
        {
#ifdef DEBUG_GC_TRACES

          fprintf(stderr, "Photon frame %p\n", frame);

          if (*(unsigned short *)ra == 0xd181) // check for "adcl $dist,%ecx" instruction
            {
              fprintf(stderr, "  return address is properly tagged!\n");
            }
          else
            {
              fprintf(stderr, "  return address is NOT properly tagged!\n");
            }

#endif

          forward_return_address(&frame[1]);

#ifdef DEBUG_GC_TRACES
          fprintf(stderr, "  forwarding %d slots\n", (next_frame - frame) - 2);

          {
            int j;
            for (j=0; j<(next_frame - frame) - 3; j++)
              {
                struct object *x = ((struct object **)&frame[3])[j];

                if (x == UNDEFINED)
                  fprintf(stderr, "  slot[%d] = %p: UNDEFINED\n", j, x);
                else if (x == NIL)
                  fprintf(stderr, "  slot[%d] = %p: NIL\n", j, x);
                else if (x == TRUE)
                  fprintf(stderr, "  slot[%d] = %p: TRUE\n", j, x);
                else if (x == FALSE)
                  fprintf(stderr, "  slot[%d] = %p: FALSE\n", j, x);
                else if (ref_is_fixnum(x))
                  fprintf(stderr, "  slot[%d] = %p: FIXNUM (%d)\n", j, x, (int)ref_to_fixnum(x));
                else
                  fprintf(stderr, "  slot[%d] = %p: ???\n", j, x);
              }
          }

#endif

          forward_multiple("  frame slot[i]", (struct object **)&frame[3], (next_frame - frame) - 3);
        }
      else
        {
#ifdef DEBUG_GC_TRACES

          void **ptr = frame;

          fprintf(stderr, "C frame %p\n", frame);

          if (*(unsigned short *)ra == 0xd181) // check for "adcl $dist,%ecx" instruction
            {
              fprintf(stderr, "  return address is NOT properly tagged!\n");
            }
          else
            {
              fprintf(stderr, "  return address is properly tagged!\n");
            }

          while (ptr < next_frame)
            fprintf(stderr,"  %p\n", *ptr++);

#endif
        }

#ifdef DEBUG_GC_TRACES
      fprintf(stderr,"\n");
#endif

      frame = next_frame;
    }

  //assert(1 == 0);
}

void forward_gcprot()
{
  struct gcprot_cell *ptr = gcprot_head;

  while (ptr != NULL)
    {
      forward("gcprot", &ptr->obj);
      ptr = ptr->next;
    }
}


ssize_t GC_RUNNING = 0;
void serialize();
struct object *garbage_collect_live(struct object *live)
{
#if defined(DEBUG_GC_TRACES) || 1
  fprintf(stderr, "------------------------------------------- GC!\n");
#endif

#if defined(PROFILE_GC_TRACES)
    ssize_t time_start = photonCurrentTimeMillis();
#endif

  with_payload = 0;
  without_payload = 0;

  todo_ptr = 0;

  // flip semispaces

  if (heap_ptr > heap_mid)
    {
      fromspace_start = heap_mid;
      fromspace_end = heap_end;
      heap_limit = heap_start + HEAP_FUDGE;
      heap_ptr = heap_mid;
    }
  else
    {
      fromspace_start = heap_start;
      fromspace_end = heap_mid;
      heap_limit = heap_mid + HEAP_FUDGE;
      heap_ptr = heap_end;
    }

#ifdef DEBUG_GC_TRACES
  fprintf(stderr, "\n*** ROOTS:\n");
#endif

  forward_roots();

  forward("live", &live);

  forward_stack();

  forward_gcprot();

  todo_scan = 0;

  while (todo_scan < todo_ptr)
    {
      struct object *o = todo[todo_scan];

#ifdef GC_UNUSED_SYMBOLS
      if (!object_flag_get(o, GC_WEAK_REFS))
#endif
        scan(o);

      todo_scan++;
    }

#ifdef GC_UNUSED_SYMBOLS

  todo_scan_at_end_of_pass1 = todo_scan;

  todo_scan = 0;

  while (todo_scan < todo_ptr)
    {
      struct object *o = todo[todo_scan];

      if (todo_scan >= todo_scan_at_end_of_pass1 ||
          object_flag_get(o, GC_WEAK_REFS))
        scan(o);

      todo_scan++;
    }

#endif

  // clean up forwarding pointers
  for (todo_ptr = 0; todo_ptr < todo_scan; todo_ptr++)
    {
      struct object *obj = todo[todo_ptr];
      struct object *e = obj->_hd[-1].extension;

      assert(e->_hd[-1].extension == e);

      struct object *values_size = e->_hd[-1].values_size;
      if (!ref_is_fixnum(values_size))
        {
          e->_hd[-1].values_size = fixnum_to_ref(((int)values_size)>>16);
        }
    }

  //newHeap();

#if 1
  // zap fromspace to better detect GC bugs
  while (fromspace_start < fromspace_end)
    {
      *(long*)fromspace_start = 0;
      fromspace_start += sizeof(long);
    }
#endif

#if defined(DEBUG_GC_TRACES) || 0
  fprintf(stderr, "\n------------------------------------------- live objects in heap = %d  with_payload = %d  without_payload = %d\n", todo_scan, with_payload, without_payload);
#endif

#if defined(PROFILE_GC_TRACES)
  //fprintf(stderr, "\n------------------------------------------- gc time %zd\n", photonCurrentTimeMillis() - time_start);
  total_gc_time += photonCurrentTimeMillis() - time_start;
#endif

#if defined(DEBUG_GC)
    heap_ptr = heap_limit + sizeof(struct object *);
#endif

  return live;
}

struct object *heap_limit_reached(struct object *live)
{
#ifdef DEBUG_GC_TRACES
  fprintf(stderr, "*** heap_limit_reached!\n");
#endif

  return garbage_collect_live(live);
}

void garbage_collect()
{
#ifdef DEBUG_GC_TRACES
  fprintf(stderr, "*** garbage_collect!\n");
#endif

  garbage_collect_live(UNDEFINED);
}

//--------------------------------- Object Model Primitives --------------------
struct object *map_lookup(size_t n, struct map *self, struct function *closure, struct object *name);

// Special send for 0 argument case since the PP_NARG macro does not detect
// it correctly
typedef struct object *(*bind_t)(
    struct object *null_n, 
    struct object *null_rcv, 
    struct object *null_closure,
    struct object *msg, 
    struct object *n, 
    struct object *rcv
);
bind_t g_bind       = 0;
bind_t g_super_bind = 0;

struct object *bind(struct object *null_n, struct object *null_rcv, struct object *null_closure, struct object *msg, struct object *n, struct object *rcv);
struct object *super_bind(struct object *null_n, struct object *null_rcv, struct object *null_closure, struct object *msg, struct object *n, struct object *rcv);

#define send0(RCV, MSG) ({                                                     \
    struct object *r_send0      = (struct object *)(RCV);		               \
    struct object *m_send0      = bind(0, 0, 0, (MSG), 0, r_send0);            \
    if (m_send0 == UNDEFINED) \
    {\
        printf("Message not understood '%s'\n", (char *)(MSG));\
        assert(0);\
    }\
    ((method_t)m_send0)(0, r_send0, m_send0);\
})

#define send(RCV, MSG, ARGS...) ({                                             \
    struct object *r_send      = (struct object *)(RCV);		               \
    struct object *m_send      = bind(0, 0, 0, (MSG), 0, r_send);              \
    if (m_send == UNDEFINED) \
    {\
        printf("Message not understood '%s'\n", (char *)(MSG));\
        assert(0);\
    }\
    ((method_t)m_send)(PHOTON_PP_NARG(ARGS), r_send, m_send, ##ARGS);\
})

#define super_send(RCV, MSG, ARGS...) ({                                       \
    struct object *r_send      = (struct object *)(RCV);		               \
    struct object *m_send      = super_bind(0, 0, 0, (MSG), 0, r_send);        \
    if (m_send == UNDEFINED) \
    {\
        printf("Message not understood %s\n", (char *)(MSG));\
        assert(0);\
    }\
    ((method_t)m_send)(PHOTON_PP_NARG(ARGS), r_send, m_send, ##ARGS);\
})

struct lookup _bind(struct object *rcv, struct object *msg)
{
    struct lookup _l; 
    struct map   *map;

    if (ref_is_fixnum(rcv))
    {
        _l.rcv    = root_fixnum->_hd[-1].extension; // TODO: why .extension ?
        assert(_l.rcv->_hd[-1].extension == _l.rcv);
        _l.offset = send(root_fixnum->_hd[-1].map, s_lookup, msg, _l.rcv);
        return _l;
    }

    if (ref_is_constant(rcv))
    {
        _l.rcv    = root_constant->_hd[-1].extension; // TODO: why .extension ?
        assert(_l.rcv->_hd[-1].extension == _l.rcv);
        _l.offset = send(root_constant->_hd[-1].map, s_lookup, msg, _l.rcv);
        return _l;
    }

    rcv = rcv->_hd[-1].extension;

    assert(rcv->_hd[-1].extension == rcv);

    if (msg == s_lookup && ((struct map *)rcv == rcv->_hd[-1].extension->_hd[-1].map)) // TODO: why .extension ?
    {
        _l.rcv    = root_map->_hd[-1].extension; // TODO: why .extension ?
        assert(_l.rcv->_hd[-1].extension == _l.rcv);
        _l.offset = map_lookup(1, (struct map *)root_map, (struct function *)NIL, s_lookup);
        return _l;
    }

    _l.rcv    = rcv;
    _l.offset  = UNDEFINED;

    while (_l.rcv != NIL) {
        _l.rcv = _l.rcv->_hd[-1].extension; // TODO: why .extension ?

        assert(_l.rcv->_hd[-1].extension == _l.rcv);

        map = _l.rcv->_hd[-1].map;
        _l.offset = send(map, s_lookup, msg, _l.rcv);

        if (_l.offset != UNDEFINED) 
        {
            return _l;
        }

        _l.rcv = _l.rcv->_hd[-1].prototype;
    }

    return _l;
}

struct object *bind(struct object *null_n, struct object *null_rcv, struct object *null_closure, struct object *msg, struct object *n, struct object *rcv)
{
    struct lookup _l = _bind(rcv, msg);

    return (_l.offset == UNDEFINED) ? UNDEFINED : 
           (ref_is_fixnum(_l.offset) ? _l.rcv->_hd[-1].values[fx(_l.offset)] :
            _l.offset);
}

struct object *super_bind(struct object *null_n, struct object *null_rcv, struct object *null_closure, struct object *msg, struct object *n, struct object *rcv)
{
    struct lookup _l      = _bind(rcv, msg);                                   
    assert(_l.rcv != NIL);                                                     
                  _l      = _bind(_l.rcv->_hd[-1].prototype, msg);           
    assert(_l.rcv != NIL);                                                     
    assert(_l.offset != UNDEFINED);                                            
    return (ref_is_fixnum(_l.offset) ? _l.rcv->_hd[-1].values[fx(_l.offset)] :
            _l.offset);

}

struct object **cache_offset(struct object **ptr, ssize_t offset)
{
    return (struct object **)((char *)ptr + offset);
}

void iterate_and_flush(struct object **start)
{
    struct object **iter = ((struct object **)(*start));
    struct object **next = (struct object **)NIL;

    if (iter != (struct object **)NIL)
        *start = NIL;

    while (iter != (struct object **)NIL)
    {
        next  = (struct object **)*iter;    
        *cache_offset(iter, -14) = UNDEFINED;
        iter  = next;
    }

}

void flush_inline_cache(struct property* p, struct object *flush_location_cache)
{
    if (BOOTSTRAP)
        return;

    iterate_and_flush(&p->value_cache);

    if (flush_location_cache == TRUE)
    {
        iterate_and_flush(&p->location_cache);
    }
}

//--------------------------------- Object Primitives --------------------------

struct object *object_get(size_t n, struct object *self, struct function *closure, struct object *name);
struct object *object_set(size_t n, struct object *self, struct function *closure, struct object *name, struct object *value);
void object_serialize_ref(struct object *obj, struct object *stack);
struct map *base_map(struct object *obj, struct object *TYPE);
struct object *map_property_offset(size_t n, struct map *self, struct function *closure, struct object *name);
struct object *object_init_static(
    size_t n,
    struct object *self, 
    struct function *closure,
    struct object *values_size, 
    struct object *payload_size
);

struct object *function_new(
    size_t n, 
    struct function *self, 
    struct function *closure,
    struct object *payload_size,
    struct object *cell_nb
);
void serialize();

struct object *arguments_get(size_t n, struct array *self, struct function *closure, struct object *name)
{
    if (ref_is_fixnum(name) && fx(name) >= 0)
    {
        ssize_t i = fx(name);
        if (i >= fx(self->count))
        {
            return UNDEFINED;
        } else
        {
            return ((struct cell *)(self->indexed_values[i]))->value;
        }
    } else if (name == s_length)
    {
        return self->count;
    }

    return object_get(n, (struct object *)self, closure, name);
}

struct object *arguments_get_cell(size_t n, struct array *self, struct function *closure, struct object *name)
{
    assert(ref_is_fixnum(name) && (fx(name) >= 0) && (fx(name) < fx(self->count)));
    return self->indexed_values[fx(name)];
}

struct object *arguments_new(size_t n, struct array *self, struct function *closure, struct object *size)
{
    ssize_t i;
    assert(ref_is_fixnum(size));
    assert(fx(size) >= 0);

    GCPROTBEGIN(self);
    GCPROT(self) = (struct object *)self;
    // size need not be protected because it is a fixnum

    struct array *new_args = (struct array *)send(
        self, 
        s_init, 
        ref(5), 
        ref(fx(size)*sizeof(struct object *) + sizeof(struct array))
    );
    inc_mem_counter(mem_arguments, 5, fx(size)*sizeof(struct object *) + sizeof(struct array));

    GCPROTBEGIN(new_args);

    GCPROT(new_args) = (struct object *)new_args;

    self = (struct array *)GCPROT(self);

    struct map *bmap = base_map((struct object *)self, ARRAY_TYPE);

    new_args = (struct array *)GCPROT(new_args);
    self = (struct array *)GCPROT(self);

    new_args->_hd[-1].map = bmap;
    new_args->_hd[-1].prototype = (struct object *)self;
    object_payload_type_set_structured((struct object *)new_args);
    
    new_args->count = size;

    for (i = 0; i < fx(size); ++i)
    {
      struct object *result = send(root_cell, s_new, UNDEFINED);

      new_args = (struct array *)GCPROT(new_args);
      new_args->indexed_values[i] = result;
    }

    GCPROTEND(self);

    return (struct object *)new_args;
}

struct object *arguments_set_cell(size_t n, struct array *self, struct function *closure, struct object *name, struct object *cell)
{
    assert(ref_is_fixnum(name) && (fx(name) >= 0) && (fx(name) < fx(self->count)));
    self->indexed_values[fx(name)] = cell;
    return cell;
}

struct object *arguments_print(size_t n, struct array *self, struct function *closure)
{
    printf("[Arguments]\n");
    return UNDEFINED;
}

struct object *arguments_set(
    size_t n,
    struct array *self, 
    struct function *closure,
    struct object *name, 
    struct object *value
)
{
    ssize_t i = fx(name);

    if (ref_is_fixnum(name) && i >= 0 && i < fx(self->count))
    {
        ((struct cell *)(self->indexed_values[i]))->value = value;
    } 
    else     
    {
        assert(name != s_length);
        return object_set(n, (struct object *)self, closure, name, value);
    }

    return value;
}

struct object *array_clone_fast(size_t n, struct object *self, struct function *closure)
{
    //assert(fx(self->_hd[-1].payload_size) == 0);
    self = self->_hd[-1].extension;

    assert(self->_hd[-1].extension == self);

    struct object *clone = (struct object *)(heap_ptr - fx(self->_hd[-1].payload_size));
    ssize_t values_size = fx(self->_hd[-1].values_size);
    ssize_t object_prelude_size = values_size * sizeof(struct object *) + sizeof(struct header);
    ssize_t object_size = object_prelude_size + fx(self->_hd[-1].payload_size);

    assert(object_size <= HEAP_FUDGE);

    ssize_t i;
    ssize_t payload_ref_nb = fx(self->_hd[-1].payload_size) / sizeof(struct object *);
    for (i=-(object_prelude_size / sizeof(struct object *)); i < payload_ref_nb; ++i)
    {
        ((struct object **)clone)[i] = ((struct object **)self)[i];
    }

    clone->_hd[-1].extension = clone;

    heap_ptr -= object_size;

    if (heap_ptr < heap_limit)
      return heap_limit_reached(clone);   
    else
      return clone;
}

struct object *array_delete(size_t n, struct array *self, struct function *closure, struct object *name)
{
    if (ref_is_fixnum(name))
    {
        printf("Deleting numeric properties on arrays not supported\n");
        exit(1);
    } else if (name == s_length)
    {
        return FALSE;
    } else
    {
        return super_send(self, s_delete, name);
    }

}

struct array *array_extend(struct array *orig, ssize_t size)
{
    ssize_t i;

    struct object *self = orig->_hd[-1].extension;

    assert(self->_hd[-1].extension == self);

    GCPROTBEGIN(orig);
    GCPROTBEGIN(self);

    GCPROT(orig) = (struct object *)orig;
    GCPROT(self) = self;

    struct object *copy = send(
        self,
        s_init,
        object_values_size(self),
        ref(sizeof(struct array) + size * sizeof(struct object *))
    );

    self = GCPROT(self);
    orig = (struct array *)GCPROT(orig);

    inc_mem_counter(mem_array, object_values_size(self), sizeof(struct array) + size * sizeof(struct object *));

    copy->_hd[-1].flags     = self->_hd[-1].flags;
    copy->_hd[-1].map       = self->_hd[-1].map;
    copy->_hd[-1].prototype = self->_hd[-1].prototype;

    for (i = 1; i <= object_values_count(self); ++i)
    {
        copy->_hd[-1].values[-i] = self->_hd[-1].values[-i];
    }
    object_values_count_set(copy, object_values_count(self));

    memcpy((void *)copy, (void *)self, fx(self->_hd[-1].payload_size));

    orig->_hd[-1].extension = copy;

    GCPROTEND(orig);

    return (struct array *)copy;
}

struct object *array_get(size_t n, struct array *self, struct function *closure, struct object *name)
{
    struct array *orig = self;
    self = (struct array *)self->_hd[-1].extension;

    assert(self->_hd[-1].extension == (struct object *)self);

    if (ref_is_fixnum(name) && fx(name) >= 0)
    {
        ssize_t i = fx(name);
        if (i >= fx(self->count))
        {
            return UNDEFINED;
        } else
        {
            return self->indexed_values[i];
        }
    } else if (name == s_length)
    {
        return self->count;
    }

    return super_send(orig, s_get, name);
}

struct object *array_length(size_t n, struct array *self, struct function *closure)
{
    return ((struct array *)self->_hd[-1].extension)->count;
}

struct object *array_new(size_t n, struct array *self, struct function *closure, struct object *size)
{
    assert(ref_is_fixnum(size));
    assert(fx(size) >= 0);

    /*
    struct object *new_array = send(
        self, 
        s_init, 
        ref(0), 
        ref(fx(size)*sizeof(struct object *) + sizeof(struct array))
    );
    */

    GCPROTBEGIN(self);
    // size need not be protected because it is a fixnum

    GCPROT(self) = (struct object *)self;

    struct object *new_array = object_init_static(
        2,
        (struct object *)self,
        (struct function *)NIL,
        ref(0), 
        ref(fx(size)*sizeof(struct object *) + sizeof(struct array))
    );
    inc_mem_counter(mem_array, 0, fx(size)*sizeof(struct object *) + sizeof(struct array));

    GCPROTBEGIN(new_array);

    GCPROT(new_array) = new_array;

    self = (struct array *)GCPROT(self);

    struct map *bmap = base_map((struct object *)self, ARRAY_TYPE);

    new_array = GCPROT(new_array);
    self = (struct array *)GCPROT(self);

    new_array->_hd[-1].map = bmap;
    new_array->_hd[-1].prototype = (struct object *)self;
    object_payload_type_set_structured(new_array);
    
    ((struct array *)new_array)->count = ref(0);

    GCPROTEND(self);

    return new_array;
}

struct object *array_print(size_t n, struct array *self, struct function *closure)
{
    printf("[Array]\n");
    return UNDEFINED;
}

struct object *array_push(size_t n, struct array *self, struct function *closure, struct object *value)
{
    return send(self, s_set, ((struct array *)self->_hd[-1].extension)->count, value);
}

struct object *array_pop(size_t n, struct array *self, struct function *closure)
{
    GCPROTBEGIN(self);
    GCPROT(self) = (struct object *)self;

    struct object *length = send(self, s_get, s_length);

    if (fx(length) > 0)
    {

        self = (struct array *)GCPROT(self);
        struct object *value  = send(self, s_get, ref(fx(length) - 1));

        GCPROTBEGIN(value);
        GCPROT(value) = value;

        self = (struct array *)GCPROT(self);
        send(self, s_set, s_length, ref(fx(length) - 1));

        value = GCPROT(value);
        GCPROTEND(self);
        return value;
    } else
    {
        GCPROTEND(self);
        return UNDEFINED;
    }
}

struct object *array_set(
    size_t n,
    struct array *self, 
    struct function *closure,
    struct object *name, 
    struct object *value
)
{
    ssize_t c;
    ssize_t i = fx(name);

    struct array *orig = self;
    self = (struct array *)self->_hd[-1].extension;

    GCPROTBEGIN(value);

    assert(self->_hd[-1].extension == (struct object *)self);

    if (ref_is_fixnum(name) && i >= 0)
    {
        if (i >= array_indexed_values_size(self))
        {
            GCPROT(value) = value;
            self = array_extend(orig, max(i+1, 2*array_indexed_values_size(self)));
            value = GCPROT(value);
        }

        if (i >= fx(self->count))
        {
            self->count = ref(i + 1);
        }
       
        self->indexed_values[i] = value;
    } else if (name == s_length && ref_is_fixnum(value))
    {
        c = fx(value);

        assert(c >= 0);

        if (c >= array_indexed_values_size(self))
        {
            self = array_extend(orig, max(c, 2*array_indexed_values_size(self)));
        }

        if (c > fx(self->count))
        {
            for (i = fx(self->count); i < c; ++i)
            {
                self->indexed_values[i] = UNDEFINED;
            }
        }

        self->count = ref(c);
    } else
    {
        GCPROTEND(value);
        return super_send(orig, s_set, name, value);
    }

    GCPROTEND(value);

    return value;
}

struct map *base_map(struct object *self, struct object *TYPE)
{
    GCPROTBEGIN(self);
    GCPROT(self) = self;

    struct map *new_map;

    if (!BOOTSTRAP)
    {
        if (self->_hd[-1].map->new_map != NIL)
        {
            GCPROTEND(self);
            return (struct map *)self->_hd[-1].map->new_map;
        } else
        {
            // Create a new family containing only the prototype object
            // to store on the prototype object's map the map used to create
            // new children
            struct map *map_clone = (struct map *)send(
                self->_hd[-1].map, 
                s_clone, 
                self->_hd[-1].map->_hd[-1].payload_size
            );
            GCPROTBEGIN(map_clone);
            GCPROT(map_clone) = (struct object *)map_clone;

            new_map = (struct map *)send0(map_clone->_hd[-1].map, s_new);
            GCPROTBEGIN(new_map);
            GCPROT(new_map) = (struct object *)new_map;

            map_clone = (struct map *)GCPROT(map_clone);
            self = GCPROT(self);

            map_clone->new_map = (struct object *)new_map;
            self->_hd[-1].map = map_clone;
            new_map->cache   = send(root_array, s_new, ref(0));

            map_clone = (struct map *)GCPROT(map_clone);
            map_clone->cache = send(root_array, s_new, ref(0));

            GCPROTEND(self);
            return new_map;
        }
    } else 
    {
        new_map       = (struct map *)send0(self->_hd[-1].map, s_new);
        new_map->type  = TYPE;

        GCPROTEND(self);
        return new_map;
    }
}

struct object *cell_new(size_t n, struct cell *self, struct function *closure, struct object *val)
{
    GCPROTBEGIN(self);
    GCPROTBEGIN(val);

    GCPROT(self) = (struct object *)self;
    GCPROT(val) = val;

    struct cell *new_cell = (struct cell *)send(self, s_init, ref(0), ref(sizeof(struct cell)));

    GCPROTBEGIN(new_cell);

    GCPROT(new_cell) = (struct object *)new_cell;

    inc_mem_counter(mem_cell, 0, sizeof(struct cell));

    val = GCPROT(val);

    new_cell->value = val;

    self = (struct cell *)GCPROT(self);

    struct map *bmap = base_map((struct object *)self, CELL_TYPE);

    new_cell = (struct cell *)GCPROT(new_cell);
    self = (struct cell *)GCPROT(self);

    new_cell->_hd[-1].map = bmap;
    new_cell->_hd[-1].prototype = (struct object *)self;
    object_payload_type_set_structured((struct object *)new_cell);

    GCPROTEND(self);

    return (struct object *)new_cell;
}

struct object *constant_print(size_t n, struct object *self, struct function *closure)
{
    if (self == UNDEFINED)
    {
        printf("undefined\n");
    } else if (self == NIL)
    {
        printf("null\n");
    } else if (self == TRUE)
    {
        printf("true\n");
    } else if (self == FALSE)
    {
        printf("false\n");
    } else
    {
        printf("Invalid constant %p\n", self);
        exit(1);
    }

    return self;
}

struct object *cwrapper_new(
    size_t n,
    struct function *self,
    struct function *closure,
    struct object   *f,
    struct object   *name)
{
    struct function *w = (struct function *)function_new(2, self, closure, ref(7), ref(0));

    // mov f, %eax
    w->code[0] = 0xb8;
    w->code[1] = byte(0, f);
    w->code[2] = byte(1, f);
    w->code[3] = byte(2, f);
    w->code[4] = byte(3, f);


    // jmp %eax
    w->code[5] = 0xff;
    w->code[6] = 0xe0;

    object_payload_type_set_binary((struct object *)w);

    struct object *s_extern = send(root_symbol, s_intern, "__extern__");
    send(w, s_set, s_extern, name); 

    return (struct object *)w;
}

struct object *cwrapper_serialize(
    size_t n,
    struct object *self,
    struct function *closure,
    struct object *stack)
{
    struct object *orig = self;
    self = self->_hd[-1].extension;
    ssize_t i = -(object_values_size(self) + sizeof(struct header) / sizeof(struct object *));
    struct object **s = (struct object **)self;

    printf("// cwrapper\n");
    printf(".align 4\n");
    printf(".globl _L%zd\n", (size_t)self);
    for (; i < 0; ++i)
    {
        object_serialize_ref(s[i], stack);
    }
    printf("_L%zd:\n",       (size_t)self);
    printf("    .byte 0xb8\n");

    struct object *s_extern = send(root_symbol, s_intern, "__extern__");
    printf("    .long _%s\n", (char *)send(self, s_get, s_extern));
    printf("    .byte 0xff\n");
    printf("    .byte 0xe0\n");
    printf("    .byte 0\n");

    object_tag(orig);
    object_tag(self);
    return self;
}

struct object *fixnum_print(size_t n, struct object *self)
{
    printf("%zd\n", fx(self));
    return UNDEFINED;
}

struct object *frame_new(
    size_t n, 
    struct frame    *self, 
    struct function *closure, 
    struct object   *arguments, 
    struct object   *rcv,
    struct function *fn
){
    ssize_t i;
    ssize_t f_n = fx(send(arguments, s_get, s_length));

    struct frame *f = (struct frame *)send(
        self, 
        s_init, 
        ref(0), 
        ref(f_n*sizeof(struct object *) + sizeof(struct frame))
    );
    inc_mem_counter(mem_frame, 0, f_n*sizeof(struct object *) + sizeof(struct frame));

    f->_hd[-1].map = base_map((struct object *)self, FRAME_TYPE);
    f->_hd[-1].prototype = (struct object *)self;
    object_payload_type_set_structured((struct object *)f);

    f->n       = fixnum_to_ref(f_n);
    f->self    = rcv;
    f->closure = fn;

    for (i = 0; i < f_n; ++i)
    {
        f->arguments[i] = send(arguments, s_get, ref(i));
    }

    return (struct object *)f;
}

struct object *frame_print(
    size_t n, 
    struct frame    *self, 
    struct function *closure)
{
    printf("frame n:%p, self:%p, closure:%p\n", self->n, self->self, self->closure); 
    
    return UNDEFINED;
}
struct object *function_allocate(
    size_t n,
    struct function *self,
    struct function *closure,
    struct object   *prelude_size, 
    struct object   *payload_size)
{
    char *ptr = (char *)raw_calloc(
        1,
        fx(prelude_size) + fx(payload_size) + sizeof(ssize_t)
    );

    *((ssize_t *)(ptr + fx(prelude_size) + fx(payload_size))) = fx(payload_size);
    struct object *po = (struct object *)(ptr + fx(prelude_size));

    return po;
}

struct object *function_clone(size_t n, struct function *self, struct function *closure)
{
    ssize_t i;
    struct function *clone = (struct function *)send(
        self, 
        s_init, 
        ref(object_values_size((struct object *)self)), 
        self->_hd[-1].payload_size
    );
    inc_mem_counter(mem_function, 
                    object_values_size((struct object *)self), 
                    fx(self->_hd[-1].payload_size));

    for (i = -object_values_count((struct object *)self); i < 0; ++i)
    {
        clone->_hd[-1].values[i] = self->_hd[-1].values[i];
    }

    clone->_hd[-1].flags        = self->_hd[-1].flags;
    clone->_hd[-1].map          = self->_hd[-1].map;
    clone->_hd[-1].prototype    = self->_hd[-1].prototype;

    for (i = 0; i < fx(clone->_hd[-1].payload_size); ++i)
    {
        clone->code[i] = self->code[i]; 
    }
    
    return (struct object *)clone;
}

struct object *function_extract(size_t n, struct function *self, struct function *closure)
{
    ssize_t i;
    struct object *code = send(root_array, s_new, self->_hd[-1].payload_size);

    for(i = 0; i < fx(self->_hd[-1].payload_size); ++i)
    {
        send(code, s_push, ref((uint8_t)self->code[i]));
    }

    return code;
}

struct object *function_get(
    size_t n, 
    struct function *self, 
    struct function *closure,
    struct object    *name
)
{

    struct function *orig = self;
    self = (struct function *)self->_hd[-1].extension;

    assert(self->_hd[-1].extension == (struct object *)self);

    if (name == s_prototype && send(self->_hd[-1].map, s_lookup, s_prototype) == UNDEFINED)
    {
        // Lazy creation of the prototype object
        struct object *prototype = send0(root_object, s_new);
        return send(orig, s_set, s_prototype, prototype);
    } else
    {
        return super_send(orig, s_get, name);
    }
}

struct object *function_intern(size_t n, struct function *self, struct function *closure, struct array *code, struct array *refs)
{
    ssize_t i;
    ssize_t l = fx(array_length(0, code, (struct function *)NIL));

    assert(fx(self->_hd[-1].payload_size) >= l);

    for(i = 0; i < l; ++i)
    {
        self->code[i] = fx(array_get(1, code, (struct function *)NIL, ref(i))) & 255;
    }

    l = fx(array_length(0, refs, (struct function *)NIL));

#if 0
        fprintf(stderr, "function_intern refs %p length = %zd\n", refs, l);
#endif

    for (i = 0; i < l ; i += 2)
    {
        ssize_t offset   = fx(array_get(1, refs, (struct function *)NIL, ref(i)));     
        struct object *p = array_get(1, refs, (struct function *)NIL, ref(i+1));

#if 0
        fprintf(stderr, "function_intern offset=%zd ref=%p\n", offset, p);
#endif

        *((struct object **)(self->code + offset)) = p; 
    }

#if 0
        fprintf(stderr, "function_intern done\n");
#endif

    return (struct object *)self;
}

struct object *function_new(
    size_t n, 
    struct function *self, 
    struct function *closure,
    struct object *payload_size,
    struct object *cell_nb
)
{
    struct object *new_fct = send(self, s_init, ref(fx(cell_nb) + 1), payload_size);
    inc_mem_counter(mem_function, 
                    fx(cell_nb) + 1, 
                    fx(payload_size));

    new_fct->_hd[-1].map       = (struct map *)send0(self->_hd[-1].map, s_new);
    new_fct->_hd[-1].prototype = (struct object *)self;

    new_fct->_hd[-1].map->next_offset = ref(-fx(cell_nb) - 1);
    new_fct->_hd[-1].map->type        = FUNCTION_TYPE;
    object_payload_type_set_hybrid(new_fct);
    object_values_count_set(new_fct, fx(cell_nb)); 

    ssize_t i = 0;

    for (i = 1; i <= fx(cell_nb); ++i)
    {
        new_fct->_hd[-1].values[-i] = UNDEFINED;
    }

    if (fx(new_fct->_hd[-1].payload_size) > 0)
    {
        // Set the number of refs in the newly created function to 0
        ssize_t ps = fx(new_fct->_hd[-1].payload_size);
        *((struct object **)((char*)new_fct + ps - sizeof(struct object *))) = ref(0);
    }

    return new_fct;
}


struct object *function_print(size_t n, struct function *self)
{
    printf("[Function]\n");
    return UNDEFINED;
}

ssize_t flush_memoized_map(struct object *f, ssize_t offset)
{
    if (offset >= 0) return offset;

    *((struct object **)((ssize_t)f - offset)) = UNDEFINED;
    return -offset;
}

struct object *function_serialize(size_t n, struct object *self, struct function *closure, struct object *stack)
{
    struct object *orig = self;
    self = self->_hd[-1].extension;
    assert(self->_hd[-1].extension == self);
    ssize_t i = -(object_values_size(self) + sizeof(struct header) / sizeof(struct object *));
    ssize_t j = fx(self->_hd[-1].payload_size);
    struct object **s = (struct object **)self;

    printf("// function\n");
    printf(".align 4\n");
    printf(".globl _L%zd\n", (size_t)self);
    for (; i < 0; ++i)
    {
        object_serialize_ref(s[i], stack);
    }

    printf("_L%zd:\n", (size_t)self);

    s = (struct object **)((ssize_t)s + j - 4);

    // Number of references in function code
    ssize_t k    = fx(*s);
    ssize_t next = j;

    if (k > 0)
    {
        k--;
        next = flush_memoized_map(self, fx(*(--s)));
    }

    for (i=0; i < j; ++i)
    {
        if (i == next)
        {
            object_serialize_ref(*((struct object **)((ssize_t)self + i)), stack);

            if (k > 0)
            {
                k--;
                next = flush_memoized_map(self, fx(*(--s)));
            }
            i = i + 3;
        } else
        {
            printf("    .byte 0x%x\n", ((struct function *)self)->code[i]);
        }
    }

    object_tag(orig);
    object_tag(self);
    return self;
}

struct object *global_currentTimeMillis(size_t n, struct object *self, struct function *closure)
{
    return ref(photonCurrentTimeMillis());
}

struct object *global_exit(size_t n, struct object *self, struct function *closure, struct object *code)
{
    exit(fx(code));
}

struct object *global_readFile(size_t n, struct object *self, struct function *closure, struct object *name)
{
    char *fileName = (char *)name;
    FILE* inFile = fopen(fileName, "r");
    if (inFile == NULL)
    {
        printf("Error in readFile -- can't open file \"%s\"\n", fileName);
        exit(1);
    }

    char buffer[255];

    char* outStr = NULL;
    size_t strLen = 0;

    while (!feof(inFile))
    {
        int numRead = fread(buffer, 1, sizeof(buffer), inFile);

        if (ferror(inFile))
        {
            printf("Error in readFile -- failed to read file");
            exit(1);        
        }

        outStr = (char*)realloc(outStr, strLen + numRead + 1);
        memcpy(outStr + strLen, buffer, numRead);
        strLen += numRead;
    }

    outStr[strLen] = '\0';

    fclose(inFile);

    struct object *content = send(root_symbol, s_intern, outStr);

    free(outStr);

    return content;
}

struct object *global_memStats(size_t n, struct object *self, struct function *closure)
{
    struct object *s = send0(root_object, s_new);

    struct object *name = send(root_symbol, s_intern, "executable");
    send(s, s_set, name, ref(exec_mem_allocated/1000));

    name = send(root_symbol, s_intern, "regular");
    send(s, s_set, name, ref(mem_allocated/1000));

    name = send(root_symbol, s_intern, "arguments");
    send(s, s_set, name, ref(mem_arguments));

    name = send(root_symbol, s_intern, "array");
    send(s, s_set, name, ref(mem_array));

    name = send(root_symbol, s_intern, "cell");
    send(s, s_set, name, ref(mem_cell));

    name = send(root_symbol, s_intern, "frame");
    send(s, s_set, name, ref(mem_frame));

    name = send(root_symbol, s_intern, "function");
    send(s, s_set, name, ref(mem_function));

    name = send(root_symbol, s_intern, "map");
    send(s, s_set, name, ref(mem_map));

    name = send(root_symbol, s_intern, "object");
    send(s, s_set, name, ref(mem_object));

    name = send(root_symbol, s_intern, "symbol");
    send(s, s_set, name, ref(mem_symbol));

    return s;    
}

struct object *global_printRef(size_t n, struct object *self, struct function *closure, struct object *ref)
{
    printf("ref = %p\n", ref);
    return self;
}

struct object *global_memAllocatedKBs(size_t n, struct object *self, struct function *closure)
{
    return ref(mem_allocated/1000);
}

struct object *global_serialize(size_t n, struct object *self, struct function *closure)
{
    serialize();
    return self;
}

struct object *map_base_size(size_t n, struct object* self, struct function *closure)
{
    return ref(sizeof(struct map));
}

struct object *map_clone(size_t n, struct map *self, struct function *closure, struct object *payload_size)
{
    assert(fx(payload_size) >= fx(self->_hd[-1].payload_size));
    
    ssize_t i;

    struct map* new_map = (struct map *)super_send(self, s_clone, payload_size);
    new_map->count   = self->count;
    new_map->next_offset = self->next_offset; 
    new_map->next_name = NIL;
    new_map->next_map  = NIL;
    new_map->type      = self->type;
    new_map->cache     = NIL;
    new_map->new_map   = NIL;

    for (i=0; i < fx(self->count); ++i)
    {
        new_map->properties[i] = self->properties[i];
    }


    if (map_values_are_immutable(self))
    {
        map_values_set_immutable(new_map);
    }

    return (struct object *)new_map;
}

struct object *map_create(size_t n, struct map *self, struct function *closure, struct object *name)
{
    ssize_t i;

    if (self->cache != NIL)
    {
        if (name == self->next_name)
        {
            return self->next_map;
        }

        struct object *l = send(self->cache, s_get, s_length);
        assert(l != UNDEFINED);

        for (i = 0; i < fx(l); i += 2)
        {
            struct object *n = send(self->cache, s_get, ref(i));

            if (n == name)
            {   struct object *r = send(self->cache, s_get, ref(i+1));
                //printf("Found %s in map cache returning %p\n", (char*)name, r);
                self->next_name = name;
                self->next_map  = r;
                return r; 
            }
        }
    }

    struct object *payload_size;

    if (fx(self->count) == map_properties_size(self))
    {
        payload_size = ref(fx(self->_hd[-1].payload_size) + 
            sizeof(struct property));
    } else
    {
        payload_size = self->_hd[-1].payload_size; 
    }

    struct map *new_map = (struct map *)send(
        self, 
        s_clone, 
        payload_size
    );

    new_map->properties[fx(new_map->count)].name           = name;
    new_map->properties[fx(new_map->count)].location       = new_map->next_offset;
    new_map->properties[fx(new_map->count)].value_cache    = NIL;
    new_map->properties[fx(new_map->count)].location_cache = NIL;
    new_map->properties[fx(new_map->count)].obj_offset     = sizeof(struct map) + fx(new_map->count)*sizeof(struct property) + 2*sizeof(struct object *); 
    new_map->properties[fx(new_map->count)].obj_offset2    = sizeof(struct map) + fx(new_map->count)*sizeof(struct property) + 3*sizeof(struct object *); 

    new_map->count       = ref(fx(new_map->count) + 1);
    new_map->next_offset = ref(fx(new_map->next_offset) - 1);
    new_map->cache       = NIL;

    if (self->cache != NIL)
    {
        send(self->cache, s_push, name);
        send(self->cache, s_push, new_map);
        new_map->cache = send(root_array, s_new, ref(0));
    } 

    return (struct object *)new_map;
}

struct object *map_delete(size_t n, struct map *self, struct function *closure, struct object *name)
{
    return FALSE;
}

struct object *map_lookup(size_t n, struct map *self, struct function *closure, struct object *name)
{
    ssize_t i;

    for (i=0; i < fx(self->count); ++i)
    {
        if (name == self->properties[i].name)
        {
            return self->properties[i].location;
        }
    }

    return UNDEFINED;
}

struct object *map_lookup_and_flush(size_t n, struct map *self, struct function *closure, struct object *name, struct object *flush_location_cache)
{
    ssize_t i;

    for (i=0; i < fx(self->count); ++i)
    {
        if (name == self->properties[i].name)
        {
            flush_inline_cache(&(self->properties[i]), flush_location_cache);
            return self->properties[i].location;
        }
    }

    return UNDEFINED;
}

struct object *map_lookup_and_flush_all(size_t n, struct map *self, struct function *closure, struct object *name)
{
    return map_lookup_and_flush(n+1, self, closure, name, TRUE);
}

struct object *map_lookup_and_flush_value_cache(size_t n, struct map *self, struct function *closure, struct object *name)
{
    return map_lookup_and_flush(n+1, self, closure, name, FALSE);
}

struct object *map_location_cache_offset(size_t n, struct map *self, struct function *closure, struct object *name)
{
    static struct property p;
    struct object *offset = map_property_offset(n, self, closure, name);
    return offset == UNDEFINED ? offset : ref(fx(offset) + ((char*)&p.location_cache - (char*)&p));
}

struct object *map_new(size_t n, struct map *self, struct function *closure)
{
    struct map* new_map = (struct map *)send(
        self, 
        s_init, 
        ref(4), 
        ref(4*sizeof(struct property) + sizeof(struct map))
    );
    inc_mem_counter(mem_map, 4, 4*sizeof(struct property) + sizeof(struct map));

    new_map->_hd[-1].map       = self->_hd[-1].map;
    new_map->_hd[-1].prototype = self->_hd[-1].map->_hd[-1].prototype;
    new_map->count             = ref(0);
    new_map->next_offset       = ref(-1);
    new_map->next_name         = NIL;
    new_map->next_map          = NIL;
    new_map->type              = MAP_TYPE;
    new_map->cache             = NIL;
    new_map->new_map           = NIL;
    object_payload_type_set_custom((struct object *)new_map);

    return (struct object *)new_map;
}

struct object *map_property_size(size_t n, struct object* self, struct function *closure)
{
    return ref(sizeof(struct property));
}

struct object *map_property_offset(size_t n, struct map *self, struct function *closure, struct object *name)
{
    ssize_t i;

    for (i=0; i < fx(self->count); ++i)
    {
        if (name == self->properties[i].name)
        {
            return ref(sizeof(struct map) + sizeof(struct property)*i); 
        }
    }

    return UNDEFINED;
}

struct object *map_print(size_t n, struct map *self, struct function *closure)
{
    printf("[Map]\n"); 
    return UNDEFINED;
}

struct object *map_remove(size_t n, struct map *self, struct function *closure, struct object *name)
{
    ssize_t i;

    struct map* new_map = (struct map *)super_send(
        self,
        s_clone,
        ref(fx(self->_hd[-1].payload_size) - sizeof(struct property))
    );

    new_map->count       = ref(fx(self->count) - 1);
    new_map->next_offset = ref(fx(self->next_offset) + 1);
    new_map->next_name   = NIL;
    new_map->next_map    = NIL;
    new_map->cache       = NIL;    
    new_map->new_map     = NIL;    

    for (i=0; i < fx(new_map->count); ++i)
    {
        if (self->properties[i].name != name)
        {
            new_map->properties[i] = self->properties[i];
        } else
        {
            // The deleted property is not the last one,
            // move the last property in the deleted property
            // slot.
            new_map->properties[i]                = self->properties[fx(new_map->count)];
            new_map->properties[i].location       = self->properties[i].location;
            // TODO: Check that the logic is correct!!!
            new_map->properties[i].value_cache    = self->properties[i].value_cache;
            new_map->properties[i].location_cache = self->properties[i].location_cache;
            new_map->properties[i].obj_offset     = sizeof(struct map) + i*sizeof(struct property) + 2*sizeof(struct object *);
            new_map->properties[i].obj_offset2    = sizeof(struct map) + i*sizeof(struct property) + 3*sizeof(struct object *);
        }
    }

    return (struct object *)new_map;
}

struct object *map_serialize(size_t n, struct object *self, struct function *closure, struct object *stack)
{
    struct object *orig = self;
    self = self->_hd[-1].extension;
    assert(self->_hd[-1].extension == self);
    struct map * self_map = (struct map *)self;

    ssize_t i = -(object_values_size(self) + sizeof(struct header) / sizeof(struct object *));
    struct object **s = (struct object **)self;

    printf("// map\n");
    printf(".align 4\n");
    printf(".globl _L%zd\n", (size_t)self);
    for (; i < 0; ++i)
    {
        object_serialize_ref(s[i], stack);
    }

    printf("_L%zd:\n", (size_t)self);

    object_serialize_ref(self_map->type, stack);
    object_serialize_ref(self_map->count, stack);
    object_serialize_ref(self_map->next_offset, stack);
    object_serialize_ref(self_map->next_name, stack);
    object_serialize_ref(self_map->next_map, stack);
    object_serialize_ref(self_map->cache, stack);
    object_serialize_ref(self_map->new_map, stack);

    for (i=0; i < fx(self_map->count); ++i)
    {
        object_serialize_ref(self_map->properties[i].name, stack);
        object_serialize_ref(self_map->properties[i].location, stack);
        object_serialize_ref(NIL, stack);
        object_serialize_ref(NIL, stack);
        printf("    .long %zd\n", self_map->properties[i].obj_offset);
        printf("    .long %zd\n", self_map->properties[i].obj_offset2);
    }

    object_tag(orig);
    object_tag(self);
    return self;
}

struct object *map_set(size_t n, struct map *self, struct function *closure, struct object *name, struct object* value)
{
    struct object *offset = send(self->_hd[-1].map, s_lookup, name);

    if (offset == UNDEFINED)
    {
        assert(
            object_values_count((struct object *)self) < 
                object_values_size((struct object *)self)
        );

        if (map_values_are_immutable(self))
            return value;

        if (self->_hd[-1].map->_hd[-1].map == self->_hd[-1].map)
        {
            assert(self->_hd[-1].map == self);
            assert(map_properties_count(self) < map_properties_size(self));
                
            // Add property on self's map
            self->properties[fx(self->count)].name           = name;
            self->properties[fx(self->count)].location       = self->next_offset;
            self->properties[fx(self->count)].value_cache    = NIL;
            self->properties[fx(self->count)].location_cache = NIL;
            self->properties[fx(self->count)].obj_offset     = sizeof(struct map) + fx(self->count)*sizeof(struct property) + 2*sizeof(struct object *);
            self->properties[fx(self->count)].obj_offset2    = sizeof(struct map) + fx(self->count)*sizeof(struct property) + 3*sizeof(struct object *);
            self->count = ref(fx(self->count) + 1);

            // Add value on self
            object_values_count_inc((struct object *)self);
            self->_hd[-1].values[fx(self->next_offset)] = value;

            self->next_offset = ref(fx(self->next_offset) - 1);

            return value;
        } else
        {
            return super_send(self, s_set, name, value);
        }
    } else
    {
        return self->_hd[-1].values[fx(offset)] = value;
    } 
}

struct object *map_value_cache_offset(size_t n, struct map *self, struct function *closure, struct object *name)
{
    static struct property p;
    struct object *offset = map_property_offset(n, self, closure, name);
    return offset == UNDEFINED ? offset : ref(fx(offset) + (ssize_t)((char*)&p.value_cache - (char*)&p));
}

struct object *object_addr_bytes(size_t n, struct object *self, struct function *closure)
{
    ssize_t i;

    struct object *arr = send(root_array, s_new, ref(sizeof(struct object *)));

    for (i = 0; i < (ssize_t)sizeof(struct object *); ++i) 
    {
        uint8_t* bytePtr = ((uint8_t*)&self) + i;
        send(arr, s_push, ref(((ssize_t)*bytePtr)));
    }

    return arr;
}

struct object *object_allocate(
    size_t n,
    struct object *self, 
    struct function *closure,
    struct object *prelude_size, 
    struct object *payload_size
)
{
    ssize_t i;

    // Align payload_size to sizeof(struct object *) bytes
    payload_size = ref((fx(payload_size) + sizeof(struct object *) - 1) & -sizeof(struct object *));

    // prelude_size and payload_size need not be protected because they are fixnums

    char *ptr = (char *)raw_calloc(
        1, 
        fx(prelude_size) + fx(payload_size) + sizeof(ssize_t)
    );

    // Initialize all values to 0
    for (i = 0; i < (fx(prelude_size) + fx(payload_size) + (ssize_t)sizeof(ssize_t)); ++i)
    {
        ptr[i] = (char)0;
    }

    // Store prelude size before the object
    *((ssize_t *)ptr) = fx(prelude_size); // TODO: this is probably not needed!
    struct object *po = (struct object *)((ssize_t)ptr + fx(prelude_size) + sizeof(ssize_t));

    //printf("object_allocate prelude_size %zd, payload_size %zd, %p\n", *((ssize_t *)ptr), fx(payload_size), po);

    return po;
}

struct object *object_clone(size_t n, struct object *self, struct function *closure, struct object *payload_size)
{
    GCPROTBEGIN(self);

    self = self->_hd[-1].extension;

    assert(self->_hd[-1].extension == self);

    GCPROT(self) = self;

    ssize_t i;
    struct object* clone = object_init_static(
        2,
        self, 
        (struct function *)NIL, 
        ref(object_values_size(self)),
        payload_size
    );

    self = GCPROT(self);

    inc_mem_counter(mem_object, object_values_size(self), fx(payload_size));

    for (i=1; i <= object_values_size(self); ++i)
    {
        clone->_hd[-1].values[-i] = self->_hd[-1].values[-i];
    }

    clone->_hd[-1].flags     = self->_hd[-1].flags;
    clone->_hd[-1].map       = self->_hd[-1].map;
    clone->_hd[-1].prototype = self->_hd[-1].prototype;

    GCPROTEND(self);

    return clone;
}

struct object *object_clone_fast(size_t n, struct object *self, struct function *closure)
{
    //assert(fx(self->_hd[-1].payload_size) == 0);
    self = self->_hd[-1].extension;

    assert(self->_hd[-1].extension == self);

    struct object *clone = (struct object *)heap_ptr;
    clone->_hd[-1].values_size   = self->_hd[-1].values_size;
    clone->_hd[-1].extension     = clone;
    clone->_hd[-1].flags         = self->_hd[-1].flags;
    clone->_hd[-1].payload_size  = self->_hd[-1].payload_size;
    clone->_hd[-1].map           = self->_hd[-1].map; 
    clone->_hd[-1].prototype     = self->_hd[-1].prototype;

    ssize_t i;
    for (i=-object_values_size(self); i < 0; ++i)
    {
        clone->_hd[-1].values[i] = self->_hd[-1].values[i];
    }


    ssize_t values_size = fx(self->_hd[-1].values_size);
    ssize_t object_prelude_size = values_size * sizeof(struct object *) + sizeof(struct header);
    ssize_t object_size = object_prelude_size + sizeof(ssize_t);

    //assert(object_size <= HEAP_FUDGE);

    heap_ptr -= object_size;

    //TODO: why is object_prelude_size written *before* the object?  this seems useless
    // Store prelude size before the object
    //*((ssize_t *)heap_ptr) = object_prelude_size;

    if (heap_ptr < heap_limit)
      return heap_limit_reached(clone);   
    else
      return clone;
}

struct object *object_delete(size_t n, struct object *self, struct function *closure, struct object *name)
{
    self = self->_hd[-1].extension;

    assert(self->_hd[-1].extension == self);

    struct map *new_map;
    struct object *offset = send(self->_hd[-1].map, BOOTSTRAP ? s_lookup : s_lookup_and_flush_all, name);
    
    if (offset == UNDEFINED)
    {
        return FALSE;
    } else
    {
        new_map = (struct map *)send(self->_hd[-1].map, s_remove, name);
        self->_hd[-1].map = new_map;  

        // If the deleted property is not the last, move the value of the last
        // property in the deleted slot
        if (-fx(offset) < object_values_count(self))
        {
            self->_hd[-1].values[fx(offset)] = self->_hd[-1].values[-object_values_count(self)];
        }

        object_values_count_dec(self);

        return TRUE;
    }
}

struct object *object_get(size_t n, struct object *self, struct function *closure, struct object *name)
{
    struct lookup _l = _bind(self->_hd[-1].extension, name);

    if (_l.offset == UNDEFINED)
    {
        return UNDEFINED;
    } else
    {
        return _l.rcv->_hd[-1].values[fx(_l.offset)];
    } 
}

struct object *object_header_size(size_t n, struct object* self, struct function *closure)
{
    return ref(sizeof(struct header));
}

struct object *object_hasOwnProperty(
    size_t n,
    struct object *self, 
    struct function *closure,
    struct object *name
)
{
    return send(self->_hd[-1].extension->_hd[-1].map, s_lookup, name) != UNDEFINED ? TRUE : FALSE;
}

struct object *object_init(
    size_t n,
    struct object *self, 
    struct function *closure,
    struct object *values_size, 
    struct object *payload_size
)
{
    GCPROTBEGIN(self);
    // values_size need not be protected because it is a fixnum

    GCPROT(self) = self;

    struct object *po = send(
        self, 
        s_allocate, 
        ref(fx(values_size) * sizeof(struct object *) + sizeof(struct header)),
        payload_size
    );

    self = GCPROT(self);

    po->_hd[-1].flags         = ref(0);
    po->_hd[-1].payload_size  = payload_size;
    po->_hd[-1].extension     = po;

    object_values_size_set(po, fx(values_size));
    object_values_count_set(po, 0);

    GCPROTEND(self);

    return po;
}

struct object *object_init_static(
    size_t n,
    struct object *self, 
    struct function *closure,
    struct object *values_size, 
    struct object *payload_size
)
{
    // values_size and payload_size need not be protected because they are fixnums

    struct object *po = object_allocate(
        2, 
        self, 
        (struct function *)NIL,
        ref(fx(values_size) * sizeof(struct object *) + sizeof(struct header)),
        payload_size
    );

    po->_hd[-1].flags         = ref(0);
    po->_hd[-1].payload_size  = payload_size;
    po->_hd[-1].extension     = po;

    object_values_size_set(po, fx(values_size));
    object_values_count_set(po, 0);

    return po;
}

struct object *object_new(size_t n, struct object *self, struct function *closure)
{
    //struct object *child     = send(self, s_init, ref(4), ref(0));
    struct object *child = object_init_static(2, self, (struct function *)NIL, ref(4), ref(0));
    inc_mem_counter(mem_object, 4, 0);
    child->_hd[-1].map       = base_map(self, OBJECT_TYPE);
    child->_hd[-1].prototype = self;
    object_payload_type_set_structured(child);
    return child;
}

#define OBJ_NEW_FAST_PRELUDE_SIZE 40
#define OBJ_NEW_FAST_SIZE 44
struct object *object_new_fast(size_t n, struct object *self, struct function *closure)
{
    if (self->_hd[-1].map->new_map == NIL)
        return object_new(n, self, closure);

    struct object *child = (struct object *)heap_ptr;
    child->_hd[-1].values_size   = ref(4);
    child->_hd[-1].extension     = child;
    child->_hd[-1].flags         = ref(STRUCTURED_PAYLOAD);
    child->_hd[-1].payload_size  = ref(0);
    child->_hd[-1].map           = (struct map *)self->_hd[-1].map->new_map;
    child->_hd[-1].prototype     = self;

    heap_ptr -= OBJ_NEW_FAST_SIZE;

    // Store prelude size before the object
    *((ssize_t *)heap_ptr) = OBJ_NEW_FAST_PRELUDE_SIZE;

    if (heap_ptr < heap_limit)
    {
        return heap_limit_reached(child);
    } else
    {
        return child;
    }
}

struct object *object_print(size_t n, struct object *self, struct function *closure)
{
    printf("[Object]\n");
    return UNDEFINED;
}

struct object *object_ref_size(size_t n, struct object* self, struct function *closure)
{
    return ref(sizeof(struct object *));
}

struct object *object_set(size_t n, struct object *self, struct function *closure, struct object *name, struct object *value)
{
    ssize_t i;
    struct object *orig = self;
    struct object *copy;
    struct object *offset;
    self = self->_hd[-1].extension;

    assert(self->_hd[-1].extension == self);

    struct map *new_map;

    offset =  send(self->_hd[-1].map, BOOTSTRAP ? s_lookup : s_lookup_and_flush_value_cache, name);

    if (offset == UNDEFINED)
    {
        // Flush ancestor caches
        if (!BOOTSTRAP)
        {
            struct object *iter = self->_hd[-1].prototype;
            while (iter != NIL && offset == UNDEFINED)
            {
                offset = send(iter->_hd[-1].extension->_hd[-1].map, s_lookup_and_flush_all, name);
                iter = iter->_hd[-1].prototype;
            }
        }

        if (object_values_count(self) >= object_values_size(self))
        {
            ssize_t size = object_values_size(self) == 0 ? 2 : 2*object_values_size(self);
            copy = send(self, s_init, ref(size), self->_hd[-1].payload_size);
            inc_mem_counter(mem_object, size, fx(self->_hd[-1].payload_size));
            copy->_hd[-1].flags     = self->_hd[-1].flags;
            copy->_hd[-1].map       = self->_hd[-1].map;
            copy->_hd[-1].prototype = self->_hd[-1].prototype;

            for (i = 1; i <= object_values_count(self); ++i)
            {
                copy->_hd[-1].values[-i] = self->_hd[-1].values[-i];
            }
            object_values_count_set(copy, object_values_count(self));

            memcpy((void *)copy, (void *)self, fx(self->_hd[-1].payload_size));

            orig->_hd[-1].extension = copy;
            self = copy;
        }

        i = fx(self->_hd[-1].map->next_offset);

        if (self->_hd[-1].map->next_name == name)
        {
            self->_hd[-1].map = (struct map *)self->_hd[-1].map->next_map;
        } else
        {
            new_map = (struct map *)send(self->_hd[-1].map, s_create, name);
            self->_hd[-1].map = new_map;  
        }
        object_values_count_inc(self);

        return self->_hd[-1].values[i] = value;
    } else
    {
        // Value cache has been flushed during lookup
        return self->_hd[-1].values[fx(offset)] = value;
    } 
}

void object_serialize_ref(struct object *obj, struct object *stack)
{
    if (ref_is_fixnum(obj) || ref_is_constant(obj))
    {
        printf("    .long %zd\n",   (size_t)obj);
    } else
    {
        struct object *ext = obj->_hd[-1].extension;
        assert(ext->_hd[-1].extension == ext);
        printf("    .long _L%zd\n", (size_t)(ext));

        if (!object_tagged(ext))
        {
            send(stack, s_push, ext);
        }
    }
}

struct object *structured_serialize(size_t n, struct object *self, struct function *closure, struct object *stack)
{
    struct object *orig = self;
    self = self->_hd[-1].extension;
    assert(self->_hd[-1].extension == self);
    ssize_t i = -(object_values_size(self) + sizeof(struct header) / sizeof(struct object *));
    ssize_t j = fx(self->_hd[-1].payload_size) / sizeof(struct object *);
    struct object **s = (struct object **)self;

    printf("// structured\n");
    printf(".align 4\n");
    printf(".globl _L%zd\n", (size_t)self);
    for (; i < 0; ++i)
    {
        object_serialize_ref(s[i], stack);
    }

    printf("_L%zd:\n", (size_t)self);

    for (; i < j; ++i)
    {
        object_serialize_ref(s[i], stack);
    }

    object_tag(orig);
    object_tag(self);
    return self;
}

struct object *symbol_intern(size_t n, struct object *self, struct function *closure, char *string)
{
    return send(symbol_table, s_intern, (struct object *)string);
}

struct object *symbol_new(size_t n, struct object *self, struct function *closure, struct object *data)
{
    GCPROTBEGIN(self);
    GCPROTBEGIN(data);

    GCPROT(self) = self;
    GCPROT(data) = data;

    ssize_t i;
    struct object *size = ref_is_fixnum(data) ? data : send(data, s_get, s_length);

    self = GCPROT(self);

    struct symbol *new_symbol = (struct symbol *)send(
        self, 
        s_init, 
        ref(0), 
        ref(fx(size) + 1)
    );
    inc_mem_counter(mem_symbol, 0, fx(size) + 1);
    
    GCPROTBEGIN(new_symbol);
    GCPROT(new_symbol) = (struct object *)new_symbol;

    self = GCPROT(self);

    struct map *bmap = base_map(self, SYMBOL_TYPE);

    new_symbol = (struct symbol *)GCPROT(new_symbol);
    self = GCPROT(self);

    new_symbol->_hd[-1].map = bmap;
    new_symbol->_hd[-1].prototype = self;
    new_symbol->string[0]        = '\0';
    new_symbol->string[fx(size)] = '\0';
    object_payload_type_set_binary((struct object *)new_symbol);

    data = GCPROT(data);
    if (!ref_is_fixnum(data))
    {
        for (i = 0; i < fx(size); ++i)
        {
            struct object *c = send(data, s_get, ref(i));
            data       = GCPROT(data);
            new_symbol = (struct symbol *)GCPROT(new_symbol);
            assert(ref_is_fixnum(c));
            new_symbol->string[i] = (char)fx(c);
        }

        GCPROTEND(self);
        return send(symbol_table, s_intern, new_symbol);
    } else
    {
        GCPROTEND(self);
        return (struct object *)new_symbol;
    }
}

struct object *symbol_print(size_t n, struct object *self, struct function *closure)
{
    printf("%s\n", (char*)self);
    return UNDEFINED;
}

struct object *binary_serialize(size_t n, struct object *self, struct function *closure, struct object *stack)
{
    struct object *orig = self;
    self = self->_hd[-1].extension;
    assert(self->_hd[-1].extension == self);
    ssize_t i = -(object_values_size(self) + sizeof(struct header) / sizeof(struct object *));

    struct object **s = (struct object **)self;

    printf("// binary\n");
    printf(".align 4\n");
    printf(".globl _L%zd\n", (size_t)self);
    for (; i < 0; ++i)
    {
        object_serialize_ref(s[i], stack);
    }
    printf("_L%zd:\n",       (size_t)self);

    ssize_t j = fx(self->_hd[-1].payload_size);
    struct symbol *symbol = (struct symbol *)self;
    for (; i < j; ++i)
    {
        printf("    .byte %d\n", symbol->string[i]);
    }

    object_tag(orig);
    object_tag(self);
    return self;
}

int hash_string(char *string)
{
#define HASH_STEP(h,c) ((((h)>>8) + (c)) * 331804471) & ((1<<30)-1)

  int h = 0;

  while (*string != '\0')
    {
      h = HASH_STEP(h, (unsigned char)*string++);
    }

  return h;
}

void symbol_table_resize(struct object *self)
{
  ssize_t i;
  struct object *symbols = send(self, s_get, s_symbols);
  ssize_t length = fx(send(symbols, s_get, s_length));
  ssize_t nb_syms = fx(send(symbols, s_get, ref(0)));
  ssize_t probe;

#if 0
  nb_syms = 0;
  for (i=2; i<length; i++)
    {
      struct object *tmp = send(symbols, s_get, ref(i));
      if ((unsigned int)tmp > 1) // not UNDEFINED or fixnum 0
        nb_syms++;
    }
#endif

  nb_syms = length; // TODO: remove me!

  ssize_t new_length = (nb_syms+1)*3 + 2;

  fprintf(stderr, "resizing symbol table %p to length=%d (nb_syms=%d)\n", self, new_length, nb_syms);

  struct object *new_symbols = send(root_array, s_new, ref(new_length));
  object_flag_set(new_symbols, GC_WEAK_REFS);

  send(new_symbols, s_set, s_length, ref(new_length));
  send(self, s_set, s_symbols, new_symbols);
  send(new_symbols, s_set, ref(0), ref(nb_syms));
  send(new_symbols, s_set, ref(1), ref(nb_syms));

  // rehash table
  for (i=2; i<length; i++)
    {
      struct object *tmp = send(symbols, s_get, ref(i));
      if ((unsigned int)tmp > 1) // not UNDEFINED or fixnum 0
        {
          probe = hash_string((char *)tmp) % (new_length-2) + 2;
          while ((unsigned int)send(new_symbols, s_get, ref(probe)) > 0) // not UNDEFINED
            {
              if (--probe < 2)
                probe = new_length-1;
            }
          send(new_symbols, s_set, ref(probe), tmp);
        }
    }
}

void symtab_intern_symbol(struct object *self, struct map *empty_map, struct object *root_symbol, struct object *sym)
{
  sym->_hd[-1].map       = empty_map;
  sym->_hd[-1].prototype = root_symbol;
  object_payload_type_set_binary(sym);

  struct object *symbols = send(self, s_get, s_symbols);
  ssize_t length = fx(send(symbols, s_get, s_length));
  ssize_t nb_syms = fx(send(symbols, s_get, ref(0)));
  ssize_t nb_non_empty = fx(send(symbols, s_get, ref(1)));
  ssize_t probe;

  //if ((nb_non_empty+1)*2 >= length || (nb_non_empty+1)*4 <= length )
  if ((nb_non_empty+1)*2 >= length) // TODO: why only grow?
    {
      symbol_table_resize(self);
      symbols = send(self, s_get, s_symbols);
      length = fx(send(symbols, s_get, s_length));
      nb_non_empty = nb_syms;
    }

  probe = hash_string((char *)sym) % (length-2) + 2;
  while ((unsigned int)send(symbols, s_get, ref(probe)) > 1) // not UNDEFINED or fixnum 0
    {
      if (--probe < 0)
        probe = length-1;
    }

  if ((unsigned int)send(symbols, s_get, ref(probe)) == 0) // UNDEFINED
    send(symbols, s_set, ref(1), ref(nb_non_empty+1));

  send(symbols, s_set, ref(probe), sym);
  send(symbols, s_set, ref(0), ref(nb_syms+1));
}

struct object *symtab_intern_string(struct object *self, char *string)
{

  struct object *symbols = send(self, s_get, s_symbols);

  ssize_t length = fx(send(symbols, s_get, s_length));
  ssize_t probe = hash_string(string) % (length-2) + 2;
  struct object *sym;

  while ((unsigned int)(sym = send(symbols, s_get, ref(probe))) > 0) // not UNDEFINED
    {
      if ((unsigned int)sym > 1 && // not fixnum 0 (deleted symbol)
          strcmp(string, (char *)sym) == 0)
        return sym;
      if (--probe < 2)
        probe = length-1;
    }

  ssize_t nb_syms = fx(send(symbols, s_get, ref(0)));
  ssize_t nb_non_empty = fx(send(symbols, s_get, ref(1)));

  //if ((nb_non_empty+1)*2 >= length || (nb_non_empty+1)*4 <= length )
  if ((nb_non_empty+1)*2 >= length) // TODO: why only grow?
    {
      fprintf(stderr,"nb_syms=%d nb_non_empty=%d length=%d\n", nb_syms, nb_non_empty, length);
      symbol_table_resize(self);
      symbols = send(self, s_get, s_symbols);
      length = fx(send(symbols, s_get, s_length));
      nb_non_empty = nb_syms;
    }

  probe = hash_string(string) % (length-2) + 2;

  while ((unsigned int)(sym = send(symbols, s_get, ref(probe))) > 1) // not UNDEFINED or fixnum 0
    {
      if (--probe < 2)
        probe = length-1;
    }

  struct object *new_symbol = send(root_symbol, s_new, ref(strlen(string)));
  strcpy((char *)new_symbol, string);

  if ((unsigned int)send(symbols, s_get, ref(probe)) == 0) // UNDEFINED
    send(symbols, s_set, ref(1), ref(nb_non_empty+1));

  send(symbols, s_set, ref(probe), new_symbol);
  send(symbols, s_set, ref(0), ref(nb_syms+1));

  return new_symbol;
}

struct object *symbol_table_intern(size_t n, struct object *self, struct function *closure, char *string)
{
  return symtab_intern_string(self, string);
}


void _log(const char* s)
{
    //printf("%s", s); 
}

//--------------------------------- Bootstrap ----------------------------------
struct object *bt_map_set(size_t n, struct map *self, struct function *closure, struct object *name, struct object* value)
{
    if (self->_hd[-1].map->_hd[-1].map == self->_hd[-1].map)
    {
        assert(self->_hd[-1].map == self);
        assert(map_properties_count(self) < map_properties_size(self));
            
        // Add property on self's map
        self->properties[fx(self->count)].name           = name;
        self->properties[fx(self->count)].location       = self->next_offset;
        self->properties[fx(self->count)].value_cache    = NIL;
        self->properties[fx(self->count)].location_cache = NIL;
        self->properties[fx(self->count)].obj_offset     = sizeof(struct map) + fx(self->count)*sizeof(struct property) + 2*sizeof(struct object *);
        self->properties[fx(self->count)].obj_offset2    = sizeof(struct map) + fx(self->count)*sizeof(struct property) + 3*sizeof(struct object *);
        self->count = ref(fx(self->count) + 1);

        // Add value on self
        object_values_count_inc((struct object *)self);
        self->_hd[-1].values[fx(self->next_offset)] = value;

        self->next_offset = ref(fx(self->next_offset) - 1);
    }

    return value;
}

struct object *wrap(method_t m, const char *name)
{
    struct object *s_name = send(root_symbol, s_intern, name);
    return send(root_cwrapper, s_new, m, s_name);
}

void bootstrap()
{
    initTimer();

    BOOTSTRAP = 1;
    g_bind       = (bind_t)bind;
    g_super_bind = (bind_t)super_bind;

    struct function *NULL_CLOSURE = (struct function *)NIL;

    ARRAY_TYPE     = ref(0);
    CELL_TYPE      = ref(1); 
    FIXNUM_TYPE    = ref(2);
    FRAME_TYPE     = ref(3);
    FUNCTION_TYPE  = ref(4);
    MAP_TYPE       = ref(5);
    OBJECT_TYPE    = ref(6);
    SYMBOL_TYPE    = ref(7);

    _log("Create Root Map\n");
    root_map = object_init_static(
        2,
        NIL, 
        NULL_CLOSURE,
        ref(30), 
        ref(30*sizeof(struct property) + sizeof(struct map))
    ); 
    root_map->_hd[-1].map       = (struct map *)root_map;
    root_map->_hd[-1].prototype = NIL;
    ((struct map *)root_map)->count       = ref(0);
    ((struct map *)root_map)->next_offset = ref(-1);
    ((struct map *)root_map)->next_name   = NIL;
    ((struct map *)root_map)->next_map    = NIL;
    ((struct map *)root_map)->type        = MAP_TYPE;
    ((struct map *)root_map)->cache       = NIL;
    ((struct map *)root_map)->new_map     = NIL;
    object_payload_type_set_custom(root_map);

    _log("Initializing Root Map\n");
    s_lookup      = object_init_static(2, NIL, NULL_CLOSURE, ref(0), ref(11));
    bt_map_set(2, (struct map *)root_map, NULL_CLOSURE, s_lookup, (struct object *)map_lookup);
    s_set         = object_init_static(2, NIL, NULL_CLOSURE, ref(0), ref(8));
    bt_map_set(2, (struct map *)root_map, NULL_CLOSURE, s_set, (struct object *)map_set);

    _log("Create implementation symbols\n");
    s_add         = object_init_static(2, NIL, NULL_CLOSURE, ref(0), ref(8));
    s_allocate    = object_init_static(2, NIL, NULL_CLOSURE, ref(0), ref(13));
    s_clone       = object_init_static(2, NIL, NULL_CLOSURE, ref(0), ref(10));
    s_create      = object_init_static(2, NIL, NULL_CLOSURE, ref(0), ref(11));
    s_delete      = object_init_static(2, NIL, NULL_CLOSURE, ref(0), ref(11));
    s_get         = object_init_static(2, NIL, NULL_CLOSURE, ref(0), ref(8));
    s_get_cell    = object_init_static(2, NIL, NULL_CLOSURE, ref(0), ref(13));
    s_init        = object_init_static(2, NIL, NULL_CLOSURE, ref(0), ref(9));
    s_intern      = object_init_static(2, NIL, NULL_CLOSURE, ref(0), ref(11));
    s_length      = object_init_static(2, NIL, NULL_CLOSURE, ref(0), ref(7));
    s_new         = object_init_static(2, NIL, NULL_CLOSURE, ref(0), ref(8));
    s_prototype   = object_init_static(2, NIL, NULL_CLOSURE, ref(0), ref(10));
    s_push        = object_init_static(2, NIL, NULL_CLOSURE, ref(0), ref(9));
    s_remove      = object_init_static(2, NIL, NULL_CLOSURE, ref(0), ref(11));
    s_set_cell    = object_init_static(2, NIL, NULL_CLOSURE, ref(0), ref(13));
    s_symbols     = object_init_static(2, NIL, NULL_CLOSURE, ref(0), ref(12));

    strcpy((char*)s_add,       "__add__");
    strcpy((char*)s_allocate,  "__allocate__");
    strcpy((char*)s_clone,     "__clone__");
    strcpy((char*)s_create,    "__create__");
    strcpy((char*)s_delete,    "__delete__");
    strcpy((char*)s_get,       "__get__");
    strcpy((char*)s_get_cell,  "__get_cell__");
    strcpy((char*)s_init,      "__init__");
    strcpy((char*)s_intern,    "__intern__");
    strcpy((char*)s_length,    "length");
    strcpy((char*)s_lookup,    "__lookup__");
    strcpy((char*)s_new,       "__new__");
    strcpy((char*)s_prototype, "prototype");
    strcpy((char*)s_push,      "__push__");
    strcpy((char*)s_remove,    "__remove__");
    strcpy((char*)s_set,       "__set__");
    strcpy((char*)s_set_cell,  "__set_cell__");
    strcpy((char*)s_symbols,   "__symbols__");

    _log("Add primitive methods on Root Map\n");
    send(root_map, s_set, s_clone,    (struct object *)map_clone);
    send(root_map, s_set, s_create,   (struct object *)map_create);
    send(root_map, s_set, s_delete,   (struct object *)map_delete);
    send(root_map, s_set, s_new,      (struct object *)map_new);
    send(root_map, s_set, s_remove,   (struct object *)map_remove);

    _log("Create Root Object\n");
    root_object = object_init_static(2, NIL, NULL_CLOSURE, ref(30), ref(0)); 
    root_object->_hd[-1].prototype = NIL;
    object_payload_type_set_structured(root_object);
    root_map->_hd[-1].prototype = root_object;
    

    _log("Create Root Object Map\n");
    root_object->_hd[-1].map = (struct map *)object_init_static(
        2,
        NIL, 
        NULL_CLOSURE,
        ref(4), 
        ref(4*sizeof(struct property) + sizeof(struct map))
    );
    root_object->_hd[-1].map->_hd[-1].prototype = root_map;

    // For bootstrapping purposes, create properties on the map first
    root_object->_hd[-1].map->properties[0].name           = s_allocate;
    root_object->_hd[-1].map->properties[0].location       = ref(-1);
    root_object->_hd[-1].map->properties[0].value_cache    = NIL;
    root_object->_hd[-1].map->properties[0].location_cache = NIL;
    root_object->_hd[-1].map->properties[0].obj_offset     = sizeof(struct map) + 2*sizeof(struct object *); 
    root_object->_hd[-1].map->properties[0].obj_offset2    = sizeof(struct map) + 3*sizeof(struct object *); 

    root_object->_hd[-1].map->properties[1].name           = s_clone;
    root_object->_hd[-1].map->properties[1].location       = ref(-2);
    root_object->_hd[-1].map->properties[1].value_cache    = NIL;
    root_object->_hd[-1].map->properties[1].location_cache = NIL;
    root_object->_hd[-1].map->properties[1].obj_offset     = sizeof(struct map) + sizeof(struct property) + 2*sizeof(struct object *); 
    root_object->_hd[-1].map->properties[1].obj_offset2    = sizeof(struct map) + sizeof(struct property) + 3*sizeof(struct object *); 

    root_object->_hd[-1].map->properties[2].name           = s_init;
    root_object->_hd[-1].map->properties[2].location       = ref(-3);
    root_object->_hd[-1].map->properties[2].value_cache    = NIL;
    root_object->_hd[-1].map->properties[2].location_cache = NIL;
    root_object->_hd[-1].map->properties[2].obj_offset     = sizeof(struct map) + 2*sizeof(struct property) + 2*sizeof(struct object *); 
    root_object->_hd[-1].map->properties[2].obj_offset2    = sizeof(struct map) + 2*sizeof(struct property) + 3*sizeof(struct object *); 
    
    root_object->_hd[-1].map->properties[3].name           = s_set;
    root_object->_hd[-1].map->properties[3].location       = ref(-4);
    root_object->_hd[-1].map->properties[3].value_cache    = NIL;
    root_object->_hd[-1].map->properties[3].location_cache = NIL;
    root_object->_hd[-1].map->properties[3].obj_offset     = sizeof(struct map) + 3*sizeof(struct property) + 2*sizeof(struct object *); 
    root_object->_hd[-1].map->properties[3].obj_offset2    = sizeof(struct map) + 3*sizeof(struct property) + 3*sizeof(struct object *); 

    root_object->_hd[-1].map->count       = ref(4);
    root_object->_hd[-1].map->next_offset = ref(-5);
    root_object->_hd[-1].map->next_name   = NIL;
    root_object->_hd[-1].map->next_map    = NIL;
    root_object->_hd[-1].map->type        = OBJECT_TYPE;
    root_object->_hd[-1].map->cache       = NIL;
    root_object->_hd[-1].map->new_map     = NIL;
    object_payload_type_set_custom((struct object *)root_object->_hd[-1].map);

    object_values_count_set(root_object, 4);

    _log("Create Root Object Map's Map\n");
    struct map *root_object_map_map = (struct map *)object_init_static(
        2,
        NIL, 
        NULL_CLOSURE,
        ref(0), 
        ref(sizeof(struct map))
    );
    root_object_map_map->_hd[-1].prototype = (struct object *)root_map;
    root_object_map_map->_hd[-1].map = root_object_map_map;
    root_object_map_map->count       = ref(0);
    root_object_map_map->next_offset = ref(-1);
    root_object_map_map->next_name   = NIL;
    root_object_map_map->next_map    = NIL;
    root_object_map_map->type        = MAP_TYPE;
    root_object_map_map->cache       = NIL;
    root_object_map_map->new_map     = NIL;
    map_values_set_immutable(root_object_map_map);
    object_payload_type_set_custom((struct object *)root_object_map_map);


    root_object->_hd[-1].map->_hd[-1].map = root_object_map_map;


    _log("Add primitive methods on Root Object\n");
    object_set(2, root_object, NULL_CLOSURE, s_set, (struct object *)object_set);

    _log("Add remaining methods\n");
    send(root_object, s_set, s_allocate, (struct object *)object_allocate);
    send(root_object, s_set, s_clone,    (struct object *)object_clone);
    send(root_object, s_set, s_init,     (struct object *)object_init);
    send(root_object, s_set, s_delete,   (struct object *)object_delete);
    send(root_object, s_set, s_get,      (struct object *)object_get);
    send(root_object, s_set, s_new,      (struct object *)object_new);

    _log("Create Root Array Object\n");
    root_array = send0(root_object, s_new);

    _log("Add primitive methods on Root Array\n");
    send(root_array,  s_set, s_delete,   (struct object *)array_delete);
    send(root_array,  s_set, s_get,      (struct object *)array_get);
    send(root_array,  s_set, s_new,      (struct object *)array_new);
    send(root_array,  s_set, s_set,      (struct object *)array_set);
    send(root_array,  s_set, s_push,     (struct object *)array_push);

    _log("Create Root Symbol\n");
    symbol_table = send0(root_object, s_new);
    root_symbol  = send0(root_object, s_new);

    _log("Add string values to symbols\n");
    struct object *symbols = send(root_array, s_new, ref(0));
    object_flag_set(symbols, GC_WEAK_REFS);
    send(symbol_table, s_set, s_symbols, symbols); 
    send(symbols, s_push, ref(0)); // number of symbols in table
    send(symbols, s_push, ref(0)); // number of non-empty entries in table

    struct map *empty_map = (struct map *)send0(
        root_symbol->_hd[-1].map,
        s_new
    );
    empty_map->type = SYMBOL_TYPE;

    symtab_intern_symbol(symbol_table, empty_map, root_symbol, s_add);
    symtab_intern_symbol(symbol_table, empty_map, root_symbol, s_allocate);
    symtab_intern_symbol(symbol_table, empty_map, root_symbol, s_clone);
    symtab_intern_symbol(symbol_table, empty_map, root_symbol, s_create);
    symtab_intern_symbol(symbol_table, empty_map, root_symbol, s_delete);
    symtab_intern_symbol(symbol_table, empty_map, root_symbol, s_get);
    symtab_intern_symbol(symbol_table, empty_map, root_symbol, s_get_cell);
    symtab_intern_symbol(symbol_table, empty_map, root_symbol, s_init);
    symtab_intern_symbol(symbol_table, empty_map, root_symbol, s_intern);
    symtab_intern_symbol(symbol_table, empty_map, root_symbol, s_length);
    symtab_intern_symbol(symbol_table, empty_map, root_symbol, s_lookup);
    symtab_intern_symbol(symbol_table, empty_map, root_symbol, s_new);
    symtab_intern_symbol(symbol_table, empty_map, root_symbol, s_prototype);
    symtab_intern_symbol(symbol_table, empty_map, root_symbol, s_push);
    symtab_intern_symbol(symbol_table, empty_map, root_symbol, s_remove);
    symtab_intern_symbol(symbol_table, empty_map, root_symbol, s_set);
    symtab_intern_symbol(symbol_table, empty_map, root_symbol, s_set_cell);
    symtab_intern_symbol(symbol_table, empty_map, root_symbol, s_symbols);

    _log("Add primitive methods on Root Symbol\n");
    send(symbol_table, s_set, s_intern, (struct object *)symbol_table_intern);
    send(root_symbol,  s_set, s_new,    (struct object *)symbol_new);
    send(root_symbol,  s_set, s_intern, (struct object *)symbol_intern);

    struct object *name;

    _log("Create Root Function object\n");
    root_function = send0(root_object, s_new);

    _log("Add primitive methods on Root Function object\n");
    send(root_function, s_set, s_allocate,  (struct object *)function_allocate);
    send(root_function, s_set, s_clone,     (struct object *)function_clone);
    send(root_function, s_set, s_intern,    (struct object *)function_intern);
    send(root_function, s_set, s_new,       (struct object *)function_new);
    send(root_function, s_set, s_get,       (struct object *)function_get);

    _log("Create CWrapper object\n");
    root_cwrapper = send(root_function, s_new, ref(7), ref(0));
    send(root_cwrapper, s_set, s_new, (struct object *)cwrapper_new);
    struct object *s_extern = send(root_symbol, s_intern, "__extern__");
    name = send(root_symbol, s_intern, "cwrapper_new");
    send(root_cwrapper, s_set, s_extern, name); 


    _log("Rewrapping C core functions\n");
    send(root_cwrapper, s_set, s_new, wrap((method_t)cwrapper_new, "cwrapper_new"));

    send(root_map, s_set, s_clone,  wrap((method_t)map_clone,  "map_clone"));
    send(root_map, s_set, s_create, wrap((method_t)map_create, "map_create"));
    send(root_map, s_set, s_delete, wrap((method_t)map_delete, "map_delete"));
    send(root_map, s_set, s_lookup, wrap((method_t)map_lookup, "map_lookup"));
    send(root_map, s_set, s_new,    wrap((method_t)map_new,    "map_new"));
    send(root_map, s_set, s_remove, wrap((method_t)map_remove, "map_remove"));
    send(root_map, s_set, s_set,    wrap((method_t)map_set,    "map_set"));

    send(root_object, s_set, s_allocate, wrap((method_t)object_allocate, "object_allocate"));
    send(root_object, s_set, s_clone,    wrap((method_t)object_clone, "object_clone"));
    send(root_object, s_set, s_init,     wrap((method_t)object_init, "object_init"));
    send(root_object, s_set, s_delete,   wrap((method_t)object_delete, "object_delete"));
    send(root_object, s_set, s_get,      wrap((method_t)object_get, "object_get"));
    send(root_object, s_set, s_new,      wrap((method_t)object_new, "object_new"));
    send(root_object, s_set, s_set,      wrap((method_t)object_set, "object_set"));

    send(root_array,  s_set, s_delete,   wrap((method_t)array_delete, "array_delete"));
    send(root_array,  s_set, s_get,      wrap((method_t)array_get, "array_get"));
    send(root_array,  s_set, s_new,      wrap((method_t)array_new, "array_new"));
    send(root_array,  s_set, s_set,      wrap((method_t)array_set, "array_set"));
    send(root_array,  s_set, s_push,     wrap((method_t)array_push, "array_push"));

    send(symbol_table, s_set, s_intern, wrap((method_t)symbol_table_intern, "symbol_table_intern"));
    send(root_symbol,  s_set, s_new,    wrap((method_t)symbol_new, "symbol_new"));
    send(root_symbol,  s_set, s_intern, wrap((method_t)symbol_intern, "symbol_intern"));

    send(root_function, s_set, s_allocate, wrap((method_t)function_allocate, "function_allocate"));
    send(root_function, s_set, s_clone,    wrap((method_t)function_clone, "function_clone"));
    send(root_function, s_set, s_intern,   wrap((method_t)function_intern, "function_intern"));
    send(root_function, s_set, s_new,      wrap((method_t)function_new, "function_new"));
    send(root_function, s_set, s_get,      wrap((method_t)function_get, "function_get"));

    name = send(root_symbol, s_intern, "__extract__");
    send(root_function, s_set, name,       wrap((method_t)function_extract, "function_extract"));

    _log("Create Root Fixnum object\n");
    root_fixnum = send0(root_object, s_new);

    _log("Create Root Constant object\n");
    root_constant = send0(root_object, s_new);

    _log("Create Root Cell object\n");
    root_cell = send0(root_object, s_new); // TODO: root_cell should have the same layout as a regular cell

    _log("Add primitive methods on Root Cell object\n");
    send(root_cell, s_set, s_new, wrap((method_t)cell_new, "cell_new"));

    _log("Create Root Arguments object\n");
    root_arguments = send(root_array, s_new, ref(0));

    _log("Add primitive methods on Root Arguments object \n");
    send(root_arguments, s_set, s_get,      wrap((method_t)arguments_get, "arguments_get"));
    send(root_arguments, s_set, s_get_cell, wrap((method_t)arguments_get_cell, "arguments_get_cell"));
    send(root_arguments, s_set, s_new,      wrap((method_t)arguments_new, "arguments_new"));
    send(root_arguments, s_set, s_set,      wrap((method_t)arguments_set, "arguments_set"));
    send(root_arguments, s_set, s_set_cell, wrap((method_t)arguments_set_cell, "arguments_set_cell"));

    _log("Create Root Frame object\n");
    root_frame = send0(root_object, s_new);

    _log("Add primitive methods on Root Frame object \n");
    send(root_frame, s_set, s_new, wrap((method_t)frame_new, "frame_new"));

    _log("Creating global object\n");
    global_object = send0(root_object, s_new);

    _log("Adding global methods\n");
    name = send(root_symbol, s_intern, "currentTimeMillis");
    send(global_object, s_set, name, wrap((method_t)global_currentTimeMillis, "global_currentTimeMillis"));

    name = send(root_symbol, s_intern, "exit");
    send(global_object, s_set, name, wrap((method_t)global_exit, "global_exit"));

    name = send(root_symbol, s_intern, "readFile");
    send(global_object, s_set, name, wrap((method_t)global_readFile, "global_readFile"));

    name = send(root_symbol, s_intern, "printRef");
    send(global_object, s_set, name, wrap((method_t)global_printRef,"global_printRef"));

    name = send(root_symbol, s_intern, "memStats");
    send(global_object, s_set, name, wrap((method_t)global_memStats, "global_memStats"));

    name = send(root_symbol, s_intern, "memAllocatedKBs");
    send(global_object, s_set, name, wrap((method_t)global_memAllocatedKBs,"global_memAllocatedKBs"));

    name = send(root_symbol, s_intern, "serialize");
    send(global_object, s_set, name, wrap((method_t)global_serialize, "global_serialize"));

    _log("Registering roots\n");
    roots = send(root_array, s_new, ref(20));

    send(roots, s_push, global_object); 
    send(roots, s_push, root_arguments); 
    send(roots, s_push, root_array); 
    send(roots, s_push, root_cell);
    send(roots, s_push, root_constant); 
    send(roots, s_push, root_fixnum); 
    send(roots, s_push, root_frame); 
    send(roots, s_push, root_function); 
    send(roots, s_push, root_map); 
    send(roots, s_push, root_object); 
    send(roots, s_push, root_symbol); 
    send(roots, s_push, symbol_table); 

    roots_names = send(root_array, s_new, ref(20));

    name = send(root_symbol, s_intern, "global");
    send(roots_names, s_push, name); 
    name = send(root_symbol, s_intern, "arguments");
    send(roots_names, s_push, name); 
    name = send(root_symbol, s_intern, "array");
    send(roots_names, s_push, name); 
    name = send(root_symbol, s_intern, "cell");
    send(roots_names, s_push, name); 
    name = send(root_symbol, s_intern, "constant");
    send(roots_names, s_push, name); 
    name = send(root_symbol, s_intern, "fixnum");
    send(roots_names, s_push, name); 
    name = send(root_symbol, s_intern, "frame");
    send(roots_names, s_push, name); 
    name = send(root_symbol, s_intern, "function");
    send(roots_names, s_push, name); 
    name = send(root_symbol, s_intern, "map");
    send(roots_names, s_push, name); 
    name = send(root_symbol, s_intern, "object");
    send(roots_names, s_push, name); 
    name = send(root_symbol, s_intern, "symbol");
    send(roots_names, s_push, name); 
    name = send(root_symbol, s_intern, "symbol_table");
    send(roots_names, s_push, name); 

    // Debugging support
    _log("Adding print method on objects\n");
    name = send(root_symbol, s_intern, "__print__");
    send(root_arguments, s_set, name, wrap((method_t)arguments_print, "arguments_print"));
    send(root_array,     s_set, name, wrap((method_t)array_print, "array_print"));
    send(root_constant,  s_set, name, wrap((method_t)constant_print, "constant_print"));
    send(root_fixnum,    s_set, name, wrap((method_t)fixnum_print, "fixnum_print"));
    send(root_frame,     s_set, name, wrap((method_t)frame_print, "frame_print"));
    send(root_map,       s_set, name, wrap((method_t)map_print, "map_print"));
    send(root_object,    s_set, name, wrap((method_t)object_print, "object_print"));
    send(root_symbol,    s_set, name, wrap((method_t)symbol_print, "symbol_print"));
    
    _log("Adding object model meta-information\n");
    name = send(root_symbol, s_intern, "__header_size__");
    send(root_object, s_set, name, wrap((method_t)object_header_size, "object_header_size"));
    name = send(root_symbol, s_intern, "__ref_size__");
    send(root_object, s_set, name, wrap((method_t)object_ref_size, "object_ref_size"));
    name = send(root_symbol, s_intern, "__addr_bytes__");
    send(root_object, s_set, name, wrap((method_t)object_addr_bytes, "object_addr_bytes"));

    name = send(root_symbol, s_intern, "__base_size__");
    send(root_map, s_set, name, wrap((method_t)map_base_size, "map_base_size"));
    name = send(root_symbol, s_intern, "__property_size__");
    send(root_map, s_set, name, wrap((method_t)map_property_size, "map_property_size"));
    name = send(root_symbol, s_intern, "__location_cache_offset__");
    send(root_map, s_set, name, wrap((method_t)map_location_cache_offset, "map_location_cache_offset"));
    name = send(root_symbol, s_intern, "__value_cache_offset__");
    send(root_map, s_set, name, wrap((method_t)map_value_cache_offset, "map_value_cache_offset"));

    _log("Initializing global symbols not used for bootstrap\n");
    s_base_map                     = send(root_symbol, s_intern, "__base_map__");
    s_hasOwnProperty               = send(root_symbol, s_intern, "hasOwnProperty");
    s_lookup_and_flush_value_cache = send(root_symbol, s_intern, "__lookup_and_flush_value_cache__");
    s_lookup_and_flush_all         = send(root_symbol, s_intern, "__lookup_and_flush_all__");

    _log("Adding standard library methods");
    send(root_object, s_set, s_hasOwnProperty, wrap((method_t)object_hasOwnProperty, "object_hasOwnProperty"));

    _log("Adding cache invalidation methods");
    send(root_map, s_set, s_lookup_and_flush_all,         wrap((method_t)map_lookup_and_flush_all, "map_lookup_and_flush_all"));
    send(root_map, s_set, s_lookup_and_flush_value_cache, wrap((method_t)map_lookup_and_flush_value_cache, "map_lookup_and_flush_value_cache"));

    _log("Serialization methods\n");
    struct object *s_serialize = send(root_symbol, s_intern, "__serialize__");
    send(root_object,   s_set, s_serialize, wrap((method_t)structured_serialize,   "structured_serialize")); 
    send(root_cwrapper, s_set, s_serialize, wrap((method_t)cwrapper_serialize,     "cwrapper_serialize"));
    send(root_symbol,   s_set, s_serialize, wrap((method_t)binary_serialize,       "binary_serialize"));
    send(root_function, s_set, s_serialize, wrap((method_t)function_serialize,     "function_serialize"));
    send(root_map,      s_set, s_serialize, wrap((method_t)map_serialize,          "map_serialize"));

    struct object *s_pop       = send(root_symbol,  s_intern, "__pop__");
    send(root_array, s_set, s_pop, wrap((method_t)array_pop, "array_pop"));

    _log("Experimenting with fast object allocation");

    name = send(root_symbol, s_intern, "__new_fast__"); 
    send(root_object, s_set, name, wrap((method_t)object_new_fast, "object_new_fast"));
    name = send(root_symbol, s_intern, "__clone_fast__");
    send(root_object, s_set, name, wrap((method_t)object_clone_fast, "object_clone_fast"));
    send(root_array,  s_set, name, wrap((method_t)array_clone_fast,  "array_clone_fast"));


    _log("Bootstrap done\n");
    BOOTSTRAP = 0;
}

void serialize()
{
    /*
    // Flush inline caches
    ssize_t i = 0;
    //printf("// Retrieving symbol array\n");
    struct object *symbols   = send(symbol_table, s_get, s_symbols);
    printf("// flushing caches in symbol array %p\n", symbols);
    ssize_t l = fx(send(symbols, s_get, s_length));

    for (i = 0; i < l; ++i)
    {
        flush_inline_cache(send(symbols, s_get, ref(i)));
    }
    */

    struct object *s_serialize = send(root_symbol,  s_intern, "__serialize__");
    struct object *s_pop       = send(root_symbol,  s_intern, "__pop__");
    struct object *stack       = send(root_array,   s_new,    ref(10));

    send(stack, s_push, roots);

    printf("_Lstatic_heap_start:\n");

    ssize_t serialized_count = 0;

    while (fx(send(stack, s_get, s_length)) > 0)
    {
        struct object *obj = send0(stack, s_pop);

        if (!object_tagged(obj))
        {
            serialized_count++;
            printf("// OBJECT PAYLOAD TYPE = %d\n", (int)object_payload_type(obj));

#if defined(DEBUG_GC_TRACES) || 0
            // Using the serializer for debugging the GC
            if (GC_RUNNING)
            {
                if(!object_flag_get(obj, GC_FORWARDED))
                {
                    fprintf(stderr, "NON-FORWARDED OBJECT: %p\n", obj);
                    //assert(1 == 0);
                }

                struct object *e = obj->_hd[-1].extension;

                assert(e->_hd[-1].extension == e);

                if(!ref_is_fixnum(e->_hd[-1].values_size))
                {
                    fprintf(stderr, "NON-CLEANED FORWARDED OBJECT: %p\n", obj);
                    e->_hd[-1].values_size = fixnum_to_ref(((int)e->_hd[-1].values_size)>>16);
                }
            }
#endif
            send(obj, s_serialize, stack);
        }


    }

    printf("_Lstatic_heap_end:\n");

    // Generate initialization code for globals
#define SELF_ASSIGN(self_assign_x) ({\
    printf("    mov     $_L%zd, %%eax\n", (size_t)(self_assign_x->_hd[-1].extension));\
    printf("    mov     %%eax, _%s\n", #self_assign_x);\
})
    
    printf("_init_globals:\n");

    printf("    mov     $_Lstatic_heap_start, %%eax\n");
    printf("    mov     %%eax, _static_heap_start\n");

    printf("    mov     $_Lstatic_heap_end, %%eax\n");
    printf("    mov     %%eax, _static_heap_end\n");

    SELF_ASSIGN(global_object);    
    SELF_ASSIGN(roots);
    SELF_ASSIGN(root_arguments);
    SELF_ASSIGN(root_array);
    SELF_ASSIGN(root_cell);
    SELF_ASSIGN(root_constant);
    SELF_ASSIGN(root_cwrapper);
    SELF_ASSIGN(root_fixnum);
    SELF_ASSIGN(root_frame);
    SELF_ASSIGN(root_function);
    SELF_ASSIGN(root_map);
    SELF_ASSIGN(root_object);
    SELF_ASSIGN(root_symbol);
    SELF_ASSIGN(symbol_table);

    SELF_ASSIGN(s_add);
    SELF_ASSIGN(s_allocate);
    SELF_ASSIGN(s_clone);
    SELF_ASSIGN(s_create);
    SELF_ASSIGN(s_delete);
    SELF_ASSIGN(s_get);
    SELF_ASSIGN(s_get_cell);
    SELF_ASSIGN(s_init);
    SELF_ASSIGN(s_intern);
    SELF_ASSIGN(s_length);
    SELF_ASSIGN(s_lookup);
    SELF_ASSIGN(s_new);
    SELF_ASSIGN(s_prototype);
    SELF_ASSIGN(s_push);
    SELF_ASSIGN(s_remove);
    SELF_ASSIGN(s_set);
    SELF_ASSIGN(s_set_cell);
    SELF_ASSIGN(s_symbols);

    SELF_ASSIGN(s_base_map);
    SELF_ASSIGN(s_hasOwnProperty);
    SELF_ASSIGN(s_lookup_and_flush_all);
    SELF_ASSIGN(s_lookup_and_flush_value_cache);

    printf("    ret\n");

    // Generate main
    printf(".globl _main\n");
    printf("_main:\n");
    printf("    pushl %%ebp\n");
    printf("    movl  %%esp, %%ebp\n");
    printf("    pushl %%esi\n");
    printf("    sub   $4, %%esp\n");
    printf("    call _newHeap\n");
    printf("    call _init_globals\n");
    printf("    pushl $0\n");
    printf("    pushl $0\n");
    printf("    movl  12(%%ebp), %%eax\n");
    printf("    pushl %%eax\n");
    printf("    movl  8(%%ebp), %%eax\n");
    printf("    pushl %%eax\n");
    printf("    call _init\n");
    printf("    add   $20, %%esp\n");
    printf("    popl %%esi\n");
    printf("    mov $0, %%eax\n");
    printf("    popl %%ebp\n");
    printf("    ret\n");

    printf("// Stats:\n");
    printf("//     object nb: %zd\n", serialized_count);
}


void gc_test()
{
    //bootstrap(); // Comment this line to use the serialized image instead 

    struct object *o     = send(root_object, s_new);
    struct object *s_foo = send(root_symbol, s_intern, "foo"); 
    send(o, s_set, s_foo, fixnum_to_ref(42)); 
    assert(send(o, s_get, s_foo) == fixnum_to_ref(42));

    o = garbage_collect_live(o);

    // Retrieving foo again because the GC will have moved it
    s_foo = send(root_symbol, s_intern, "foo"); 
    assert(send(o, s_get, s_foo) == fixnum_to_ref(42));


    temps[0] = send(root_object, s_new);                    
    temps[1] = send(root_symbol, s_intern, "__clone_fast__");

    ssize_t i,j;
    for (j = 0; j < 100; ++j)
    {
        for (i = 0; i < 100000; ++i)
        {
            send(temps[0], temps[1]);
        }
        printf("Iteration %zd\n", j);
    }
}


void init(ssize_t argc, char *argv[])
{
    //printf("// init: heap_start = %p, heap_limit = %p, heap_ptr = %p\n", heap_start, heap_limit, heap_ptr);

    void *ebp;
    asm("movl %%ebp,%0" : "=r"(ebp));

    main_frame = *(void**)ebp;

    initTimer();

#if defined(PROFILE_GC_TRACES)
    ssize_t exec_start_time = 0;
#endif 

    struct object *s_eval = send(root_symbol, s_intern, "eval");
    struct object *script;

    ssize_t i;
    
    for (i=1; i < argc; ++i)
    {
        if (strcmp(argv[i], "--") == 0)
        {
            ++i;
            break;
        } else if (strcmp(argv[i], "--gc-test") == 0)
        {
            gc_test();
            exit(0);
        }
    }

    struct object *arguments   = send(root_array, s_new, ref(argc-i));

    for (; i < argc; ++i)
    {
        struct object *arg = send(root_symbol, s_intern, argv[i]);
        send(arguments, s_push, arg);
    }

    struct object *s_arguments = send(root_symbol, s_intern, "arguments");
    send(global_object, s_set, s_arguments, arguments);

    struct object *s_init      = send(root_symbol, s_intern, "init");
    method_t init = (method_t)send(global_object, s_get, s_init);

    for (i = 1; i < argc; ++i)
    {
        if (strcmp(argv[i], "--") == 0)
        {
            break;
        } 

        script = global_readFile(1, global_object, (struct function *)NIL, (struct object *)argv[i]);
        send(global_object, s_eval, script);
    }

    init(0, global_object, (struct object *)init);

#if defined(PROFILE_GC_TRACES)
    ssize_t exec_time = photonCurrentTimeMillis() - exec_start_time;
    fprintf(stderr, "\n------------------------------------------- total gc time: %zd, total exec time: %zd, %% gc time: %zd\n", 
                     total_gc_time, exec_time, (total_gc_time*100/exec_time));
#endif
}

#endif // #ifndef _PHOTON_H
