/**  Copyright Erick Lavoie **/
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <sys/mman.h>
#include <assert.h>

#ifndef _PHOTON_H
#define _PHOTON_H

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

//--------------------------------- Memory Allocation Primitives ---------------
inline ssize_t ref_is_object(struct object *obj);

char *start = 0;
char *next  = 0;
char *end   = 0;
unsigned long long mem_allocated = 0;      // in Bytes
unsigned long long exec_mem_allocated = 0; // in Bytes

#define MB *1000000
#define HEAP_SIZE (10 MB)

extern void newHeap()
{
    //start = (char *)calloc(1, HEAP_SIZE);
    start = (char *)mmap(
        0,
        HEAP_SIZE,
        PROT_READ | PROT_WRITE | PROT_EXEC,
        MAP_PRIVATE | MAP_ANON,
        -1,
        0
    );

    assert(start != MAP_FAILED);

    next = start;
    end = start + HEAP_SIZE;
    //printf("heap start = %p, next = %p, end = %p\n", start, next, end);
}

inline char *raw_calloc(size_t nb, size_t size)
{
    size_t obj_size = nb * size;
    char *new_ptr = 0;
    mem_allocated += obj_size;

    if ((next + obj_size) > end)
    {
        if (obj_size > HEAP_SIZE)
        {
            new_ptr = (char *)calloc(1, obj_size);
            assert(new_ptr != 0);
            return new_ptr;
        } else
        {
            newHeap();   
        }
    }

    new_ptr = next;
    
    // Increment and align pointer 
    next += (obj_size + (sizeof(ssize_t) - 1)) & (-(sizeof(ssize_t)));

    return new_ptr;
}

// Allocate executable memory
inline char *ealloc(size_t size)
{
    exec_mem_allocated += size;
    /*
    char *p = (char *)mmap(
        0,
        size,
        PROT_READ | PROT_WRITE | PROT_EXEC,
        MAP_PRIVATE | MAP_ANON,
        -1,
        0
    );

    assert(p != MAP_FAILED);
    */
    return raw_calloc(1, size);

}

struct object *method_min = (struct object *)-1;
struct object *method_max = (struct object *)0;

struct object *register_function(struct object *f)
{
    if (f < method_min)
    {
        method_min = f;
    } 

    if (f > method_max)
    {
        method_max = f;
    }

    return f;
}

#define inc_mem_counter(COUNTER, props, payload)\
(                                               \
    COUNTER += props*sizeof(struct object *) +  \
               sizeof(struct header)         +  \
               payload                          \
)                                                

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
    struct object     *attributes;
    struct object     *next;
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
    size_t             n;
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
    struct object     *cache;
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

struct object *array_base_map     = (struct object *)0;
struct object *arguments_base_map = (struct object *)0;
struct object *cell_base_map      = (struct object *)0;
struct object *frame_base_map     = (struct object *)0;
struct object *object_base_map    = (struct object *)0;
struct object *symbol_base_map    = (struct object *)0;

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

struct object *ARRAY_TYPE    = (struct object *)0;
struct object *CELL_TYPE     = (struct object *)0;
struct object *FIXNUM_TYPE   = (struct object *)0;
struct object *FRAME_TYPE    = (struct object *)0;
struct object *FUNCTION_TYPE = (struct object *)0;
struct object *MAP_TYPE      = (struct object *)0;
struct object *OBJECT_TYPE   = (struct object *)0;
struct object *SYMBOL_TYPE   = (struct object *)0;

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
    return (struct object *)((i * 2) + 1);
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
    return ((ssize_t)obj - 1) / 2;
}

inline char byte(ssize_t i, struct object *obj)
{
    return (char)(((size_t)obj >> i*8) & 0xff);
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
        _l.rcv    = root_fixnum->_hd[-1].extension;
        _l.offset = send(root_fixnum->_hd[-1].map, s_lookup, msg);
        return _l;
    }

    if (ref_is_constant(rcv))
    {
        _l.rcv    = root_constant->_hd[-1].extension;
        _l.offset = send(root_constant->_hd[-1].map, s_lookup, msg);
        return _l;
    }

    rcv = rcv->_hd[-1].extension;

    if (msg == s_lookup && ((struct map *)rcv == rcv->_hd[-1].map))
    {
        _l.rcv    = root_map->_hd[-1].extension;
        _l.offset = map_lookup(1, (struct map *)root_map, (struct function *)NIL, s_lookup);
        return _l;
    }

    _l.rcv    = rcv;
    _l.offset  = UNDEFINED;

    while (_l.rcv != NIL) {
        _l.rcv = _l.rcv->_hd[-1].extension;

        map = _l.rcv->_hd[-1].map;
        _l.offset = send(map, s_lookup, msg);

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

void flush_inline_cache(struct object *symbol)
{
    if (BOOTSTRAP || ref_is_fixnum(symbol) || ref_is_constant(symbol))
        return;

    //printf("// flushing inline cache for symbol %p\n", symbol);
    //printf("// flushing inline cache for symbol %s\n", (char*)symbol);

    // Invalidate caches
    //
    // -38: cached map
    // -33: cached method
    //   0: next cache
    struct object **iter = (struct object **)symbol->_hd[-1].extension->_hd[-1].values[-1];
    struct object **next = (struct object **)NIL;

    if (iter != (struct object **)NIL)
        symbol->_hd[-1].extension->_hd[-1].values[-1] = NIL;

    while (iter != (struct object **)NIL)
    {
        printf("// iter = %p\n", iter);

        next  = (struct object **)*iter;    
        *iter = UNDEFINED;
        *cache_offset(iter, -33) = UNDEFINED;
        *cache_offset(iter, -38) = UNDEFINED;
        iter  = next;
    }

    //printf("// flushed inline cache for symbol %s\n", (char*)symbol);
}

//--------------------------------- Object Primitives --------------------------

struct object *object_get(size_t n, struct object *self, struct function *closure, struct object *name);
struct object *object_set(size_t n, struct object *self, struct function *closure, struct object *name, struct object *value);
void object_serialize_ref(struct object *obj, struct object *stack);
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

    struct array *new_args = (struct array *)send(
        self, 
        s_init, 
        ref(5), 
        ref(fx(size)*sizeof(struct object *) + sizeof(struct array))
    );
    inc_mem_counter(mem_arguments, 5, fx(size)*sizeof(struct object *) + sizeof(struct array));

    if (arguments_base_map != UNDEFINED)
    {
        new_args->_hd[-1].map = (struct map *)arguments_base_map;
    } else
    {
        new_args->_hd[-1].map       = (struct map *)send0(self->_hd[-1].map, s_new);
        new_args->_hd[-1].map->type = ARRAY_TYPE;
    }

    new_args->_hd[-1].prototype = (struct object *)self;
    
    new_args->count = size;

    for (i = 0; i < fx(size); ++i)
    {
        new_args->indexed_values[i] = send(root_cell, s_new, UNDEFINED);
    }

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

    struct object *copy = send(
        self,
        s_init,
        object_values_size(self),
        ref(sizeof(struct array) + size * sizeof(struct object *))
    );
    inc_mem_counter(mem_array, object_values_size(self), sizeof(struct array) + size * sizeof(struct object *));

    copy->_hd[-1].map       = self->_hd[-1].map;
    copy->_hd[-1].prototype = self->_hd[-1].prototype;

    for (i = 1; i <= object_values_count(self); ++i)
    {
        copy->_hd[-1].values[-i] = self->_hd[-1].values[-i];
    }
    object_values_count_set(copy, object_values_count(self));

    memcpy((void *)copy, (void *)self, fx(self->_hd[-1].payload_size));

    orig->_hd[-1].extension = copy;

    return (struct array *)copy;
}

struct object *array_get(size_t n, struct array *self, struct function *closure, struct object *name)
{
    struct array *orig = self;
    self = (struct array *)self->_hd[-1].extension;

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

struct object *array_new(size_t n, struct array *self, struct function *closure, struct object *size)
{
    assert(ref_is_fixnum(size));
    assert(fx(size) >= 0);

    struct object *new_array = send(
        self, 
        s_init, 
        ref(0), 
        ref(fx(size)*sizeof(struct object *) + sizeof(struct array))
    );
    inc_mem_counter(mem_array, 0, fx(size)*sizeof(struct object *) + sizeof(struct array));

    if (array_base_map != UNDEFINED)
    {
        new_array->_hd[-1].map = (struct map *)array_base_map;
    } else
    {
        new_array->_hd[-1].map       = (struct map *)send0(self->_hd[-1].map, s_new);
        new_array->_hd[-1].map->type = ARRAY_TYPE;
    }

    new_array->_hd[-1].prototype = (struct object *)self;
    
    ((struct array *)new_array)->count = ref(0);

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
    struct object *length = send(self, s_get, s_length);

    if (fx(length) > 0)
    {
        struct object *value  = send(self, s_get, ref(fx(length) - 1));
        send(self, s_set, s_length, ref(fx(length) - 1));
        return value;
    } else
    {
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

    if (ref_is_fixnum(name) && i >= 0)
    {
        if (i >= array_indexed_values_size(self))
        {
            self = array_extend(orig, max(i+1, 2*array_indexed_values_size(self)));
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

        if (i >= array_indexed_values_size(self))
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
        return super_send(orig, s_set, name, value);
    }

    return value;
}

struct object *cell_new(size_t n, struct cell *self, struct function *closure, struct object *val)
{
    struct cell *new_cell = (struct cell *)send(self, s_init, ref(0), ref(sizeof(struct cell)));
    inc_mem_counter(mem_cell, 0, sizeof(struct cell));

    new_cell->value = val;

    if (cell_base_map != UNDEFINED)
    {
        new_cell->_hd[-1].map = (struct map *)cell_base_map;
    } else
    {
        new_cell->_hd[-1].map       = (struct map *)send0(self->_hd[-1].map, s_new);
        new_cell->_hd[-1].map->type = CELL_TYPE;
    }

    new_cell->_hd[-1].prototype = (struct object *)self;

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

    if (frame_base_map != UNDEFINED)
    {
        f->_hd[-1].map = (struct map *)frame_base_map;
    } else
    {
        f->_hd[-1].map       = (struct map *)send0(self->_hd[-1].map, s_new);
        f->_hd[-1].map->type = FRAME_TYPE;
    }

    f->_hd[-1].prototype = (struct object *)self;

    f->n       = f_n;
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
    printf("frame n:%zd, self:%p, closure:%p\n", self->n, self->self, self->closure); 
    
    return UNDEFINED;
}
struct object *function_allocate(
    size_t n,
    struct function *self,
    struct function *closure,
    struct object   *prelude_size, 
    struct object   *payload_size)
{
    char *ptr = (char *)ealloc(
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

struct object *function_intern(size_t n, struct function *self, struct function *closure, struct array *code)
{
    ssize_t i;
    ssize_t l = fx(send(code, s_get, s_length));

    assert(fx(self->_hd[-1].payload_size) >= l);

    for(i = 0; i < l; ++i)
    {
        self->code[i] = fx(send(code, s_get, ref(i))) & 255;
    }

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

    object_values_count_set(new_fct, fx(cell_nb)); 

    ssize_t i = 0;

    for (i = 1; i <= fx(cell_nb); ++i)
    {
        new_fct->_hd[-1].values[-i] = UNDEFINED;
    }

    return new_fct;
}


struct object *function_print(size_t n, struct function *self)
{
    printf("[Function]\n");
    return UNDEFINED;
}

struct object *function_serialize(size_t n, struct object *self, struct function *closure, struct object *stack)
{
    struct object *orig = self;
    self = self->_hd[-1].extension;
    ssize_t i = -(object_values_size(self) + sizeof(struct header) / sizeof(struct object *));
    ssize_t j = fx(self->_hd[-1].payload_size);
    struct object **s = (struct object **)self;

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
    ssize_t next = fx(*(--s));

    for (i=0; i < j; ++i)
    {
        if (i == next)
        {
            object_serialize_ref(*((struct object **)((ssize_t)self + i)), stack);

            if (k > 0)
            {
                k--;
                next = fx(*(--s));
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
    new_map->count = self->count;
    new_map->next_offset = self->next_offset; 
    new_map->type  = self->type;
    new_map->cache = NIL;

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
        struct object *l = send(self->cache, s_get, s_length);
        assert(l != UNDEFINED);

        for (i = 0; i < fx(l); i += 2)
        {
            struct object *n = send(self->cache, s_get, ref(i));

            if (n == name)
            {   struct object *r = send(self->cache, s_get, ref(i+1));
                //printf("Found %s in map cache returning %p\n", (char*)name, r);
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

    new_map->properties[fx(new_map->count)].name     = name;
    new_map->properties[fx(new_map->count)].location = new_map->next_offset;

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
    new_map->_hd[-1].prototype = (struct object *)self;
    new_map->count             = ref(0);
    new_map->next_offset       = ref(-1);
    new_map->type              = MAP_TYPE;
    new_map->cache             = NIL;

    return (struct object *)new_map;
}

struct object *map_property_size(size_t n, struct object* self, struct function *closure)
{
    return ref(sizeof(struct property));
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
    new_map->cache       = NIL;    

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
            new_map->properties[i]          = self->properties[fx(new_map->count)];
            new_map->properties[i].location = self->properties[i].location;
        }
    }

    return (struct object *)new_map;
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
            self->properties[fx(self->count)].name     = name;
            self->properties[fx(self->count)].location = self->next_offset;
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
    *((ssize_t *)ptr) = fx(prelude_size);
    struct object *po = (struct object *)((ssize_t)ptr + fx(prelude_size) + sizeof(ssize_t));

    //printf("object_allocate prelude_size %zd, payload_size %zd, %p\n", *((ssize_t *)ptr), fx(payload_size), po);

    return po;
}

struct object *object_clone(size_t n, struct object *self, struct function *closure, struct object *payload_size)
{
    self = self->_hd[-1].extension;

    ssize_t i;
    struct object* clone = send(
        self, 
        s_init, 
        ref(object_values_size(self)),
        payload_size
    );
    inc_mem_counter(mem_object, object_values_size(self), fx(payload_size));

    for (i=1; i <= object_values_size(self); ++i)
    {
        clone->_hd[-1].values[-i] = self->_hd[-1].values[-i];
    }

    clone->_hd[-1].map       = self->_hd[-1].map;
    clone->_hd[-1].prototype = self->_hd[-1].prototype;

    return clone;
}

struct object *object_delete(size_t n, struct object *self, struct function *closure, struct object *name)
{
    self = self->_hd[-1].extension;

    struct map *new_map;
    struct object *offset = send(self->_hd[-1].map, s_lookup, name);
    
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

struct object *object_init(
    size_t n,
    struct object *self, 
    struct function *closure,
    struct object *values_size, 
    struct object *payload_size
)
{
    struct object *po = send(
        self, 
        s_allocate, 
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

struct object *object_init_static(
    size_t n,
    struct object *self, 
    struct function *closure,
    struct object *values_size, 
    struct object *payload_size
)
{
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
    struct map *new_map;

    if (object_base_map != UNDEFINED)
    {
        new_map = (struct map *)object_base_map;
    } else
    {
        new_map       = (struct map *)send0(self->_hd[-1].map, s_new);
        new_map->type = OBJECT_TYPE;
    }

    struct object *child     = send(self, s_init, ref(4), ref(0));
    inc_mem_counter(mem_object, 4, 0);
    child->_hd[-1].map       = new_map;
    child->_hd[-1].prototype = self;
    return child;
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
    self = self->_hd[-1].extension;

    struct map *new_map;
    struct object *offset = send(self->_hd[-1].map, s_lookup, name);

    if (offset == UNDEFINED)
    {
        if (object_values_count(self) >= object_values_size(self))
        {
            ssize_t size = object_values_size(self) == 0 ? 2 : 2*object_values_size(self);
            copy = send(self, s_init, ref(size), self->_hd[-1].payload_size);
            inc_mem_counter(mem_object, size, fx(self->_hd[-1].payload_size));
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
        
        new_map = (struct map *)send(self->_hd[-1].map, s_create, name);
        self->_hd[-1].map = new_map;  
        object_values_count_inc(self);

        return self->_hd[-1].values[i] = value;
    } else
    {
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
    ssize_t i = -(object_values_size(self) + sizeof(struct header) / sizeof(struct object *));
    ssize_t j = fx(self->_hd[-1].payload_size) / sizeof(struct object *);
    struct object **s = (struct object **)self;

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
    ssize_t i;
    struct object *size = ref_is_fixnum(data) ? data : send(data, s_get, s_length);

    struct symbol *new_symbol = (struct symbol *)send(
        self, 
        s_init, 
        ref(0), 
        ref(fx(size) + 1)
    );
    inc_mem_counter(mem_symbol, 0, fx(size) + 1);

    if (symbol_base_map != UNDEFINED)
    {
        new_symbol->_hd[-1].map = (struct map *)symbol_base_map;
    } else
    {
        new_symbol->_hd[-1].map = (struct map *)send0(self->_hd[-1].map, s_new);
        new_symbol->_hd[-1].map->type = SYMBOL_TYPE;
    }

    new_symbol->_hd[-1].prototype = self;
    new_symbol->string[0]        = '\0';
    new_symbol->string[fx(size)] = '\0';

    if (!ref_is_fixnum(data))
    {
        for (i = 0; i < fx(size); ++i)
        {
            struct object *c = send(data, s_get, ref(i));
            assert(ref_is_fixnum(c));
            new_symbol->string[i] = (char)fx(c);
        }
        return send(symbol_table, s_intern, new_symbol);
    } else
    {
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
    ssize_t i = -(object_values_size(self) + sizeof(struct header) / sizeof(struct object *));

    struct object **s = (struct object **)self;

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

struct object *symbol_table_intern(size_t n, struct object *self, struct function *closure, char *string)
{
    ssize_t i; 
    struct object *symbols = send(self, s_get, s_symbols);
    ssize_t length = fx(send(symbols, s_get, s_length));
    struct object *s;

    for (i = 0; i < length; ++i)
    {
        s = send(symbols, s_get, ref(i));
        if (!strcmp(string, (char *)s))
            return s;
    }

    struct object *new_symbol = send(root_symbol, s_new, ref(strlen(string)));
    strcpy((char *)new_symbol, string);
    send(symbols, s_push, new_symbol);
   
    return new_symbol;
}


void _log(const char* s)
{
    //printf("%s", s); 
}

//--------------------------------- Memory Management --------------------------
char *from_start = 0;
char *from_end   = 0;

struct object *shallow_copy(struct object *self)
{
    ssize_t prelude_size = object_prelude_size(self);
    ssize_t payload_size = fx(self->_hd[-1].payload_size);

    struct object *copy = object_allocate(
        2, 
        NIL, 
        (struct function *)NIL, 
        ref(prelude_size), 
        ref(payload_size)
    );

    memcpy(
        ((void *)((ssize_t)copy - prelude_size)), 
        ((void *)((ssize_t)self - prelude_size)),
        (size_t)(prelude_size + payload_size)
    );
    
    return copy;
}

struct object *forward(struct object *self)
{
    if (self >= method_min && self <= method_max)
    {
        // This is a C function
        return self;
    } else if (ref_is_fixnum(self) || fx(self) < fx(RESERVED))
    {
        return self;
    } else if ((ssize_t)self->_hd[-1].map & 1 == 1)
    {
        return (struct object *)((ssize_t)self->_hd[-1].map & -2);
    } else
    {
        self->_hd[-1].map = (struct map *)((ssize_t)shallow_copy(self) | 1);
        return (struct object *)((ssize_t)self->_hd[-1].map & -2);
    }
}

struct object *array_inner_forward(size_t n, struct array *self, struct function *closure)
{
    ssize_t i;
    struct object **a = (struct object **)self;
    ssize_t prelude_length = (object_prelude_size((struct object *)self) / sizeof(struct object *));
    ssize_t payload_length = fx(self->count) + sizeof(struct array) / sizeof(struct object *);

    for (i = -prelude_length; i < payload_length; ++i)
    {
        a[i] = forward(a[i]);
    }

    return (struct object *)self;
}

struct object *cell_inner_forward(size_t n, struct cell *self, struct function *closure)
{
    ssize_t i;
    struct object **a = (struct object **)self;
    ssize_t prelude_length = (object_prelude_size((struct object *)self) / sizeof(struct object *));
    ssize_t payload_length = sizeof(struct cell) / sizeof(struct object *);

    for (i = -prelude_length; i < payload_length; ++i)
    {
        a[i] = forward(a[i]);
    }

    return (struct object *)self;
}

struct object *fixnum_inner_forward(size_t n, struct object *self, struct function *closure)
{
    return self;
}

struct object *function_inner_forward(size_t n, struct function *self, struct function *closure)
{
    ssize_t i;
    struct object **a = (struct object **)self;
    ssize_t prelude_length = (object_prelude_size((struct object *)self) / sizeof(struct object *));
    ssize_t payload_length = sizeof(struct function) / sizeof(struct object *);

    for (i = -prelude_length; i < payload_length; ++i)
    {
        a[i] = forward(a[i]);
    }

    // TODO: forward also pointers in function's code

    return (struct object *)self;
}

struct object *map_inner_forward(size_t n, struct map *self, struct function *closure)
{
    ssize_t i;
    struct object **a = (struct object **)self;
    ssize_t prelude_length = (object_prelude_size((struct object *)self) / sizeof(struct object *));
    ssize_t payload_length = (fx(self->count) * sizeof(struct property) + sizeof(struct map)) 
                             / sizeof(struct object *);

    for (i = -prelude_length; i < payload_length; ++i)
    {
        a[i] = forward(a[i]);
    }

    return (struct object *)self;
}

struct object *object_inner_forward(size_t n, struct object *self, struct function *closure)
{
    ssize_t i;
    struct object **a = (struct object **)self;
    ssize_t prelude_length = (object_prelude_size((struct object *)self) / sizeof(struct object *));
    ssize_t payload_length = 0;

    for (i = -prelude_length; i < payload_length; ++i)
    {
        a[i] = forward(a[i]);
    }

    return (struct object *)self;
}

method_t inner_forward[] = {
    (method_t)array_inner_forward,
    (method_t)cell_inner_forward,
    (method_t)fixnum_inner_forward,
    (method_t)function_inner_forward,
    (method_t)map_inner_forward,
    (method_t)object_inner_forward,
    (method_t)object_inner_forward
};

struct object *object_scan(struct object *self)
{
    ssize_t type = fx(self->_hd[-1].map->type);

    printf("object_scan %p type %zd\n", self, type);

    if (type >= 7 || type < 0)
    {
        printf("Unsupported type number '%zd'\n", type);
        exit(1);
    }
    return inner_forward[type](0, self, NIL);
}

// TODO: Make sure values are always initialized to UNDEFINED for object fields
void mm_test()
{
    ssize_t i;

    from_start = start;
    from_end   = end;

    struct object *roots[3];

    // Creating some objects
    roots[0] = send0(root_object, s_new);
    roots[1] = send(root_symbol, s_intern, (struct object *)"foo");
    roots[2] = send(root_symbol, s_intern, (struct object *)"bar");
    roots[3] = send(root_array, s_new, ref(10));
    
    // Initializing members to some values
    send(roots[0], s_set, roots[1], ref(42)); 
    send(roots[0], s_set, roots[2], roots[3]);
    send(roots[3], s_push, ref(1));
    send(roots[3], s_push, ref(2));
    send(roots[3], s_push, roots[0]);

    // Check initial working of the object model
    assert(send(roots[0], s_get, roots[1]) == ref(42)); 
    assert(send(roots[0], s_get, roots[2]) == roots[3]);
    assert(send(roots[3], s_get, ref(0))   == ref(1));
    assert(send(roots[3], s_get, ref(1))   == ref(2));
    assert(send(roots[3], s_get, ref(2))   == roots[0]);

    // Create a new memory location for forwarded objects
    newHeap();

    _log("Forwarding roots\n");
    char *scan = next;

    for (i = 0; i < 4; ++i)
    {
        roots[i] = forward(roots[i]);
    }
    
    roots_names    = forward(roots_names);
    root_array     = forward(root_array);
    root_arguments = forward(root_array);
    root_cell      = forward(root_cell);
    root_fixnum    = forward(root_fixnum);
    root_function  = forward(root_function);
    root_map       = forward(root_map);
    root_object    = forward(root_object);
    root_symbol    = forward(root_symbol);

    s_add       = forward(s_add);
    s_allocate  = forward(s_allocate);
    s_clone     = forward(s_clone);
    s_create    = forward(s_create);
    s_delete    = forward(s_delete);
    s_get       = forward(s_get);
    s_get_cell  = forward(s_get_cell);
    s_init      = forward(s_init);
    s_intern    = forward(s_intern);
    s_length    = forward(s_length);
    s_lookup    = forward(s_lookup);
    s_new       = forward(s_new);
    s_prototype = forward(s_prototype);
    s_push      = forward(s_push);
    s_remove    = forward(s_remove);
    s_set       = forward(s_set);
    s_set_cell  = forward(s_set_cell);
    s_symbols   = forward(s_symbols);


    _log("Beginning scan\n");
    while (scan < end && scan < next)
    {
        // Ajust for prelude size
        ssize_t size = *((ssize_t *)scan); 
        scan = (char *)((ssize_t)scan + size + sizeof(ssize_t));

        // Scan object
        object_scan((struct object *)scan);

        // Adjust for payload_size, align on a word boundary
        size = fx(((struct object *)scan)->_hd[-1].payload_size);
        size = (size + sizeof(struct object *) - 1) & -sizeof(struct object *);
        scan = (char *)((ssize_t)scan + size);
    }

    _log("Erasing initial memory page\n");
    scan = from_start;
    while (scan < from_end)
    {
        *scan = (char)0;
        scan += 1;
    }

    _log("Testing object model\n");
    assert(scan < end);
    assert(send(roots[0], s_get, roots[1]) == ref(42)); 
    assert(send(roots[0], s_get, roots[2]) == roots[3]);
    assert(send(roots[3], s_get, ref(0))   == ref(1));
    assert(send(roots[3], s_get, ref(1))   == ref(2));
    assert(send(roots[3], s_get, ref(2))   == roots[0]);
    assert(send(root_symbol, s_intern, (struct object *)"foo") == roots[1]);
    assert(send(root_symbol, s_intern, (struct object *)"bar") == roots[2]);

    _log("Memory management test succeeded\n");

}

//--------------------------------- Bootstrap ----------------------------------
struct object *bt_map_set(size_t n, struct map *self, struct function *closure, struct object *name, struct object* value)
{
    if (self->_hd[-1].map->_hd[-1].map == self->_hd[-1].map)
    {
        assert(self->_hd[-1].map == self);
        assert(map_properties_count(self) < map_properties_size(self));
            
        // Add property on self's map
        self->properties[fx(self->count)].name     = name;
        self->properties[fx(self->count)].location = self->next_offset;
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
    BOOTSTRAP = 1;
    ssize_t i;
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
    ((struct map *)root_map)->type        = MAP_TYPE;
    ((struct map *)root_map)->cache       = NIL;

    _log("Initializing Root Map\n");
    s_lookup      = object_init_static(2, NIL, NULL_CLOSURE, ref(0), ref(11));
    bt_map_set(2, (struct map *)root_map, NULL_CLOSURE, s_lookup, register_function((struct object *)map_lookup));
    s_set         = object_init_static(2, NIL, NULL_CLOSURE, ref(0), ref(8));
    bt_map_set(2, (struct map *)root_map, NULL_CLOSURE, s_set, register_function((struct object *)map_set));

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
    send(root_map, s_set, s_clone,    register_function((struct object *)map_clone));
    send(root_map, s_set, s_create,   register_function((struct object *)map_create));
    send(root_map, s_set, s_delete,   register_function((struct object *)map_delete));
    send(root_map, s_set, s_new,      register_function((struct object *)map_new));
    send(root_map, s_set, s_remove,   register_function((struct object *)map_remove));

    _log("Create Root Object\n");
    root_object = object_init_static(2, NIL, NULL_CLOSURE, ref(30), ref(0)); 
    root_object->_hd[-1].prototype = NIL;
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
    root_object->_hd[-1].map->properties[0].name     = s_allocate;
    root_object->_hd[-1].map->properties[0].location = ref(-1);

    root_object->_hd[-1].map->properties[1].name     = s_clone;
    root_object->_hd[-1].map->properties[1].location = ref(-2);

    root_object->_hd[-1].map->properties[2].name     = s_init;
    root_object->_hd[-1].map->properties[2].location = ref(-3);
    
    root_object->_hd[-1].map->properties[3].name     = s_set;
    root_object->_hd[-1].map->properties[3].location = ref(-4);

    root_object->_hd[-1].map->count       = ref(4);
    root_object->_hd[-1].map->next_offset = ref(-5);
    root_object->_hd[-1].map->type        = OBJECT_TYPE;
    root_object->_hd[-1].map->cache       = NIL;

    object_values_count_set(root_object, 4);

    _log("Create Root Object Map's Map\n");
    struct map *root_object_map_map = (struct map *)object_init_static(
        2,
        NIL, 
        NULL_CLOSURE,
        ref(0), 
        ref(sizeof(struct map))
    );
    root_object_map_map->_hd[-1].prototype = (struct object *)root_object;
    root_object_map_map->_hd[-1].map = root_object_map_map;
    root_object_map_map->count       = ref(0);
    root_object_map_map->next_offset = ref(-1);
    root_object_map_map->type        = MAP_TYPE;
    root_object_map_map->cache       = NIL;
    map_values_set_immutable(root_object_map_map);

    root_object->_hd[-1].map->_hd[-1].map = root_object_map_map;


    _log("Add primitive methods on Root Object\n");
    object_set(2, root_object, NULL_CLOSURE, s_set, register_function((struct object *)object_set));

    _log("Add remaining methods\n");
    send(root_object, s_set, s_allocate, register_function((struct object *)object_allocate));
    send(root_object, s_set, s_clone,    register_function((struct object *)object_clone));
    send(root_object, s_set, s_init,     register_function((struct object *)object_init));
    send(root_object, s_set, s_delete,   register_function((struct object *)object_delete));
    send(root_object, s_set, s_get,      register_function((struct object *)object_get));
    send(root_object, s_set, s_new,      register_function((struct object *)object_new));

    _log("Create Root Array Object\n");
    root_array = send0(root_object, s_new);

    _log("Add primitive methods on Root Array\n");
    send(root_array,  s_set, s_delete,   register_function((struct object *)array_delete));
    send(root_array,  s_set, s_get,      register_function((struct object *)array_get));
    send(root_array,  s_set, s_new,      register_function((struct object *)array_new));
    send(root_array,  s_set, s_set,      register_function((struct object *)array_set));
    send(root_array,  s_set, s_push,     register_function((struct object *)array_push));

    _log("Create Root Symbol\n");
    symbol_table = send0(root_object, s_new);
    root_symbol  = send0(root_object, s_new);

    _log("Add string values to symbols\n");
    struct object *symbols = send(root_array, s_new, ref(0));
    send(symbol_table, s_set, s_symbols, symbols); 
    
    send(symbols, s_push, s_add);
    send(symbols, s_push, s_allocate);
    send(symbols, s_push, s_clone);
    send(symbols, s_push, s_create);
    send(symbols, s_push, s_delete);
    send(symbols, s_push, s_get);
    send(symbols, s_push, s_get_cell);
    send(symbols, s_push, s_init);
    send(symbols, s_push, s_intern);
    send(symbols, s_push, s_length);
    send(symbols, s_push, s_lookup);
    send(symbols, s_push, s_new);
    send(symbols, s_push, s_prototype);
    send(symbols, s_push, s_push);
    send(symbols, s_push, s_remove);
    send(symbols, s_push, s_set);
    send(symbols, s_push, s_set_cell);
    send(symbols, s_push, s_symbols);

    struct map *empty_map = (struct map *)send0(
        root_symbol->_hd[-1].map,
        s_new
    );
    empty_map->type = SYMBOL_TYPE;

    ssize_t l = fx(send(symbols, s_get, s_length));
    struct object *s = 0;
    for (i = 0; i < l; ++i)
    {
        s = send(symbols, s_get, ref(i));
        s->_hd[-1].map       = empty_map;
        s->_hd[-1].prototype = root_symbol;
    }

    _log("Add primitive methods on Root Symbol\n");
    send(symbol_table, s_set, s_intern, register_function((struct object *)symbol_table_intern));
    send(root_symbol,  s_set, s_new,    register_function((struct object *)symbol_new));
    send(root_symbol,  s_set, s_intern, register_function((struct object *)symbol_intern));

    struct object *name;

    _log("Create Root Function object\n");
    root_function = send0(root_object, s_new);

    _log("Add primitive methods on Root Function object\n");
    send(root_function, s_set, s_allocate,  register_function((struct object *)function_allocate));
    send(root_function, s_set, s_clone,     register_function((struct object *)function_clone));
    send(root_function, s_set, s_intern,    register_function((struct object *)function_intern));
    send(root_function, s_set, s_new,       register_function((struct object *)function_new));
    send(root_function, s_set, s_get,       register_function((struct object *)function_get));

    _log("Create CWrapper object\n");
    root_cwrapper = send(root_function, s_new, ref(7), ref(0));
    send(root_cwrapper, s_set, s_new, register_function((struct object *)cwrapper_new));
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
    root_cell = send0(root_object, s_new);

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

    _log("Optimizing map creation\n");
    object_base_map                          = send0(root_object->_hd[-1].map, s_new);
    ((struct map *)object_base_map)->type    = OBJECT_TYPE;
    struct object *a = send(root_array, s_new, ref(4));
    ((struct map *)object_base_map)->cache   = a;

    array_base_map                           = send0(root_array->_hd[-1].map, s_new);
    ((struct map *)array_base_map)->type     = ARRAY_TYPE;

    arguments_base_map                       = send0(root_arguments->_hd[-1].map, s_new);
    ((struct map *)arguments_base_map)->type = ARRAY_TYPE; 

    cell_base_map                            = send0(root_cell->_hd[-1].map, s_new);
    ((struct map *)cell_base_map)->type      = CELL_TYPE;

    frame_base_map                           = send0(root_frame->_hd[-1].map, s_new);
    ((struct map *)frame_base_map)->type     = FRAME_TYPE;

    symbol_base_map                          = send0(root_symbol->_hd[-1].map, s_new);
    ((struct map *)symbol_base_map)->type    = SYMBOL_TYPE;

    _log("Serialization methods\n");
    struct object *s_serialize = send(root_symbol, s_intern, "__serialize__");
    send(root_object,   s_set, s_serialize, wrap((method_t)structured_serialize,   "structured_serialize")); 
    send(root_cwrapper, s_set, s_serialize, wrap((method_t)cwrapper_serialize,     "cwrapper_serialize"));
    send(root_symbol,   s_set, s_serialize, wrap((method_t)binary_serialize,       "binary_serialize"));
    send(root_function, s_set, s_serialize, wrap((method_t)function_serialize,     "function_serialize"));

    struct object *s_pop       = send(root_symbol,  s_intern, "__pop__");
    send(root_array, s_set, s_pop, wrap((method_t)array_pop, "array_pop"));

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
    send(stack, s_push, object_base_map);
    send(stack, s_push, array_base_map);
    send(stack, s_push, arguments_base_map);
    send(stack, s_push, cell_base_map);
    send(stack, s_push, frame_base_map);
    send(stack, s_push, symbol_base_map);

    while (fx(send(stack, s_get, s_length)) > 0)
    {
        struct object *obj = send0(stack, s_pop);
        if (!object_tagged(obj))
        {
            send(obj, s_serialize, stack);
        }
    }

    // Generate initialization code for globals
#define SELF_ASSIGN(self_assign_x) ({\
    printf("    mov     $_L%zd, %%eax\n", (size_t)(self_assign_x->_hd[-1].extension));\
    printf("    mov     %%eax, _%s\n", #self_assign_x);\
})
    
    printf("_init_globals:\n");
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

    SELF_ASSIGN(array_base_map);
    SELF_ASSIGN(arguments_base_map);
    SELF_ASSIGN(cell_base_map);
    SELF_ASSIGN(frame_base_map);
    SELF_ASSIGN(object_base_map);
    SELF_ASSIGN(symbol_base_map);

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
    printf("    ret\n");

    // Generate main
    printf(".globl _main\n");
    printf("_main:\n");
    printf("    pushl %%ebp\n");
    printf("    movl  %%esp, %%ebp\n");
    printf("    sub   $8, %%esp\n");
    printf("    call _newHeap\n");
    printf("    call _init_globals\n");
    printf("    pushl $0\n");
    printf("    pushl $0\n");
    printf("    movl  12(%%ebp), %%eax\n");
    printf("    pushl %%eax\n");
    printf("    movl  8(%%ebp), %%eax\n");
    printf("    pushl %%eax\n");
    printf("    call _init\n");
    printf("    add   $24, %%esp\n");
    printf("    mov $0, %%eax\n");
    printf("    popl %%ebp\n");
    printf("    ret\n");
}

void init(ssize_t argc, char *argv[])
{
    struct object *s_eval = send(root_symbol, s_intern, "eval");
    struct object *script;

    ssize_t i;
    
    for (i=1; i < argc; ++i)
    {
        if (!strcmp(argv[i], "--"))
        {
            ++i;
            break;
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

    for (i = 1; i < argc; ++i)
    {
        if (!strcmp(argv[i], "--"))
        {
            break;
        } 

        script = global_readFile(1, global_object, (struct function *)NIL, (struct object *)argv[i]);
        send(global_object, s_eval, script);
    }

    struct object *s_init      = send(root_symbol, s_intern, "init");
    send0(global_object, s_init);
}

#endif // #ifndef _PHOTON_H
