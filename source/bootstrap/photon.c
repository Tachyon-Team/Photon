/**  Copyright Erick Lavoie **/
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <assert.h>

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
struct function;
struct header;
struct lookup;
struct map;
struct object;
struct property;
struct symbol;

typedef struct object *(*method_t)(size_t n, struct object *receiver, ...);

//--------------------------------- Memory Allocation Primitives ---------------
inline ssize_t ref_is_object(struct object *obj);

char *start = 0;
char *next  = 0;
char *end   = 0;
size_t mem_allocated = 0; // in KB

#define MB *1000000
#define HEAP_SIZE (1 MB)

extern void newHeap()
{
    start = (char *)calloc(1, HEAP_SIZE);
    mem_allocated += HEAP_SIZE / 1000;

    assert(start != 0);

    next = start;
    end = start + HEAP_SIZE;
    //printf("heap start = %p, next = %p, end = %p\n", start, next, end);
}

inline char *raw_calloc(size_t nb, size_t size)
{
    size_t obj_size = nb * size;

    if ((next + obj_size) > end)
    {
        newHeap();   
    }

    char *new_ptr = next;
    
    // Increment and align pointer 
    next += (obj_size + (sizeof(ssize_t))) & (-(sizeof(ssize_t)));

    return new_ptr;
}

// Allocate executable memory
inline char *ealloc(size_t size)
{
    return (char *)mmap(
        0,
        size,
        PROT_READ | PROT_WRITE | PROT_EXEC,
        MAP_PRIVATE | MAP_ANON,
        -1,
        0
    );
}

//--------------------------------- Inner Object Layouts -----------------------
struct header {
    struct object     *values[0];
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

struct function {
    struct header      _hd[0];
    char               code[0];
};

struct lookup {
    struct object     *rcv;
    struct object     *offset;
};

struct map {
    struct header      _hd[0];
    struct object     *count;
    struct property    properties[0];
};

struct object {
    struct header      _hd[0];
};

struct symbol {
    struct header      _hd[0];
    char*              string;
};

//--------------------------------- Root Objects ------------------------------
struct object *roots              = (struct object *)0;
struct object *roots_names        = (struct object *)0;
struct object *root_array         = (struct object *)0;
struct object *root_fixnum        = (struct object *)0;
struct object *root_function      = (struct object *)0;
struct object *root_map           = (struct object *)0;
struct object *root_object        = (struct object *)0;
struct object *root_symbol        = (struct object *)0;

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
struct object *s_intern      = (struct object *)0;
struct object *s_length      = (struct object *)0;
struct object *s_lookup      = (struct object *)0;
struct object *s_new         = (struct object *)0;
struct object *s_push        = (struct object *)0;
struct object *s_remove      = (struct object *)0;
struct object *s_set         = (struct object *)0;
struct object *s_symbols     = (struct object *)0;

//--------------------------------- Helper Functions ---------------------------
inline ssize_t ref_to_fixnum(struct object *obj);
inline ssize_t fx(struct object *obj);
inline ssize_t object_values_count(struct object *self);
inline struct object *ref(ssize_t i);

inline ssize_t array_indexed_values_size(struct array *self)
{
    return (fx(self->_hd[-1].payload_size) - sizeof(struct object *)) /
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
    return (fx(self->_hd[-1].payload_size) - sizeof(struct object *)) /
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

inline ssize_t object_values_count(struct object *self)
{
    return fx(self->_hd[-1].flags) & 255;
}

inline void object_values_count_dec(struct object *self)
{
    self->_hd[-1].flags = ref(fx(self->_hd[-1].flags) - 1);
}

inline void object_values_count_inc(struct object *self)
{
    self->_hd[-1].flags = ref(fx(self->_hd[-1].flags) + 1);
}

inline void object_values_count_set(struct object *self, size_t count)
{
    self->_hd[-1].flags = ref((fx(self->_hd[-1].flags) & -256) | (count & 255));
}

inline ssize_t object_values_size(struct object *self)
{
    return (fx(self->_hd[-1].flags) & 0xFF00) >> 8;
}

inline void object_values_size_set(struct object *self, size_t size)
{
    assert(size < 256); 

    self->_hd[-1].flags = ref((fx(self->_hd[-1].flags) & (-65281)) | 
        ((size & 255) << 8));
}

inline struct object *ref(ssize_t i)
{
    return fixnum_to_ref(i);
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

//--------------------------------- Object Model Primitives --------------------
struct object *map_lookup(size_t n, struct map *self, struct object *name);


#define send(RCV, MSG, ARGS...) ({                                             \
    struct object *r      = (struct object *)(RCV);		                       \
    struct lookup _l      = _bind(r, (MSG));                                   \
    (_l.offset == UNDEFINED) ? UNDEFINED :                                     \
        ((method_t)(_l.rcv->_hd[-1].values[fx(_l.offset)]))(PHOTON_PP_NARG(ARGS), r, ##ARGS);\
});

#define super_send(RCV, MSG, ARGS...) ({                                       \
    struct object *r      = (struct object *)(RCV);		                       \
    struct lookup _l      = _bind(r, (MSG));                                   \
    assert(_l.rcv != NIL);                                                     \
                  _l      = _bind(_l.rcv->_hd[-1].prototype, (MSG));           \
    assert(_l.rcv != NIL);                                                     \
    assert(_l.offset != UNDEFINED);                                            \
    (_l.offset == UNDEFINED) ? UNDEFINED :                                     \
        ((method_t)(_l.rcv->_hd[-1].values[fx(_l.offset)]))(PHOTON_PP_NARG(ARGS), r, ##ARGS);\
});

struct lookup _bind(struct object *rcv, struct object *msg)
{
    struct lookup _l; 
    struct map   *map;

    if (msg == s_lookup && ((struct map *)rcv == rcv->_hd[-1].map))
    {
        _l.rcv    = root_map;
        _l.offset = map_lookup(1, (struct map *)root_map, s_lookup);
        return _l;
    }

    if (ref_is_fixnum(rcv))
    {
        _l.rcv    = root_fixnum;
        _l.offset = send(root_fixnum->_hd[-1].map, s_lookup, msg);
        return _l;
    }

    _l.rcv    = rcv;
    _l.offset  = UNDEFINED;

    while (_l.rcv != NIL) {
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

//--------------------------------- Object Primitives --------------------------
struct object *array_delete(size_t n, struct array *self, struct object *name)
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

struct object *array_get(size_t n, struct array *self, struct object *name)
{
    if (ref_is_fixnum(name) && fx(name) >= 0)
    {
        ssize_t i = fx(name);
        if (i > fx(self->count))
        {
            return UNDEFINED;
        } else
        {
            return self->indexed_values[i];
        }
    }

    return super_send(self, s_get, name);
}

struct object *array_new(size_t n, struct array *self, struct object *size)
{
    assert(ref_is_fixnum(size));
    assert(fx(size) >= 0);

    struct object *new_array = send(
        self, 
        s_allocate, 
        ref(4), 
        ref(fx(size)*sizeof(struct object *) + sizeof(struct object *))
    );

    new_array->_hd[-1].map       = (struct map *)send(self->_hd[-1].map, s_new);
    new_array->_hd[-1].prototype = (struct object *)self;
    
    ((struct array *)new_array)->count = ref(0);

    return new_array;
}

struct object *array_push(size_t n, struct array *self, struct object *value)
{
    assert(array_indexed_values_size(self) > fx(self->count));
    return send(self, s_set, self->count, value);
}

struct object *array_set(
    size_t n,
    struct array *self, 
    struct object *name, 
    struct object *value
)
{
    ssize_t c;
    ssize_t i = fx(name);

    if (ref_is_fixnum(name) && i >= 0)
    {
        assert(i < array_indexed_values_size(self));

        if (i >= fx(self->count))
        {
            self->count = ref(i + 1);
        }
        
        self->indexed_values[i] = value;
    } else if (name == s_length && ref_is_fixnum(value))
    {
        c = fx(value);

        assert(c >= 0 && c <= array_indexed_values_size(self));

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
        return super_send(self, s_set, name, value);
    }

    return value;
}

struct object *function_allocate(
    size_t n,
    struct function *self,
    struct object   *values_size, 
    struct object   *payload_size)
{
    char *ptr = (char *)ealloc(
        fx(values_size) * sizeof(struct object *) + 
            sizeof(struct header) + fx(payload_size)
    );

    assert(ptr != MAP_FAILED);
   
    struct object *po = (struct object *)(
        ptr + fx(values_size) * sizeof(struct object *) + sizeof(struct header)
    );

    po->_hd[-1].payload_size  = payload_size;

    object_values_size_set(po, fx(values_size));
    object_values_count_set(po, 0);

    return po;
}

struct object *function_intern(size_t n, struct function *self, struct array *code)
{
    assert(fx(self->_hd[-1].payload_size) >= array_indexed_values_size(code));
    ssize_t i;

    for(i = 0; i < array_indexed_values_size(code); ++i)
    {
        self->code[i] = fx(code->indexed_values[i]) & 255;
    }

    return (struct object *)self;
}

struct object *function_new(size_t n, struct function *self, struct object *size)
{
    struct object *new_fct = send(self, s_allocate, ref(4), size);

    new_fct->_hd[-1].map       = (struct map *)send(self->_hd[-1].map, s_new);
    new_fct->_hd[-1].prototype = (struct object *)self;

    return new_fct;
}

struct object *map_clone(size_t n, struct map *self, struct object *payload_size)
{
    assert(fx(payload_size) >= fx(self->_hd[-1].payload_size));
    
    ssize_t i;
    struct map* new_map = (struct map *)super_send(self, s_clone, payload_size);
    new_map->count = self->count;

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

struct object *map_create(size_t n, struct map *self, struct object *name)
{
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

    size_t i = fx(new_map->count);
    new_map->count = ref(fx(new_map->count) + 1);

    new_map->properties[i].name     = name;
    new_map->properties[i].location = ref(-fx(new_map->count));

    return (struct object *)new_map;
}

struct object *map_delete(size_t n, struct map *self, struct object *name)
{
    assert(self->_hd[-1].map->_hd[-1].map == self->_hd[-1].map);

    ssize_t size;
    struct map *new_map;
    struct object *offset = send(self, s_lookup, name);
    
    if (offset == UNDEFINED)
    {
        return FALSE;
    } else
    {
        // Recursively delete the property on the map's map
        if (self->_hd[-1].map != self)
        {
            new_map = (struct map *)send(self->_hd[-1].map, s_remove, name);

            // Preserve circularity on new_map
            new_map->_hd[-1].map = new_map;

            size = object_values_size((struct object *)self);

            // If the deleted property is not the last, move the value of the
            // last property in the deleted slot
            if (-fx(offset) < size)
            {
                self->_hd[-1].values[fx(offset)]    = self->_hd[-1].values[-size];
                new_map->_hd[-1].values[fx(offset)] =  
                    new_map->_hd[-1].values[-size];
            }

            object_values_count_dec((struct object *)self);
            object_values_count_dec((struct object *)new_map);

            return TRUE;
        } else
        {
            // Deleting properties on a circular map is not supported
            return FALSE;
        }
    }
}

struct object *map_lookup(size_t n, struct map *self, struct object *name)
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

struct object *map_new(size_t n, struct map *self)
{
    struct map* new_map = (struct map *)send(
        self, 
        s_allocate, 
        ref(4), 
        ref(4*sizeof(struct property) + sizeof(struct object *))
    );

    new_map->_hd[-1].map       = self->_hd[-1].map;
    new_map->_hd[-1].prototype = (struct object *)self;
    new_map->count             = ref(0);

    return (struct object *)new_map;
}

struct object *map_remove(size_t n, struct map *self, struct object *name)
{
    ssize_t i;

    struct map* new_map = (struct map *)super_send(
        self,
        s_clone,
        ref(fx(self->_hd[-1].payload_size) - sizeof(struct property))
    );

    new_map->count = ref(fx(new_map->count) - 1);

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
            new_map->properties[i]          = self->properties[fx(new_map->count) + 1];
            new_map->properties[i].location = self->properties[i].location;
        }
    }

    return (struct object *)new_map;
}

struct object *map_set(size_t n, struct map *self, struct object *name, struct object* value)
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
            // Recursively add the property on the map's map
            if (self->_hd[-1].map != self)
            {
                struct map *new_map = (struct map *)send(
                    self->_hd[-1].map, 
                    s_create, 
                    name
                );

                // Preserve circularity on new_map
                new_map->_hd[-1].map = new_map;

                // Add the value on both the map's map and self
                object_values_count_inc((struct object *)new_map);
                object_values_count_inc((struct object *)self);
                new_map->_hd[-1].values[-map_values_count(self)] = UNDEFINED;
                self   ->_hd[-1].values[-map_values_count(self)] = value;
            } else
            {
                assert(map_properties_count(self) < map_properties_size(self));
                
                // Add property on self's map
                self->properties[fx(self->count)].name     = name;
                self->properties[fx(self->count)].location = 
                    ref(-fx(self->count) - 1);
                self->count = ref(fx(self->count) + 1);

                // Add value on self
                object_values_count_inc((struct object *)self);
                self->_hd[-1].values[-map_values_count(self)] = value;
            }
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

struct object *object_allocate(
    size_t n,
    struct object *self, 
    struct object *values_size, 
    struct object *payload_size
)
{
    char *ptr = (char *)raw_calloc(
        1, 
        fx(values_size) * sizeof(struct object *) + 
            sizeof(struct header) + fx(payload_size)
    );
    
    struct object *po = (struct object *)(
        ptr + fx(values_size) * sizeof(struct object *) + sizeof(struct header)
    );

    po->_hd[-1].payload_size  = payload_size;

    assert(fx(values_size) < 256); 
    object_values_size_set(po, fx(values_size));
    object_values_count_set(po, 0);

    return po;
}

struct object *object_clone(size_t n, struct object *self, struct object *payload_size)
{
    ssize_t i;
    struct object* clone = send(
        self, 
        s_allocate, 
        ref(object_values_size(self)),
        payload_size
    );

    for (i=1; i <= object_values_size(self); ++i)
    {
        clone->_hd[-1].values[-i] = self->_hd[-1].values[-i];
    }

    clone->_hd[-1].map       = self->_hd[-1].map;
    clone->_hd[-1].prototype = self->_hd[-1].prototype;

    return clone;
}

struct object *object_delete(size_t n, struct object *self, struct object *name)
{
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
        if (-fx(offset) < object_values_size(self))
        {
            self->_hd[-1].values[fx(offset)] = self->_hd[-1].values[-object_values_size(self)];
        }

        object_values_count_dec(self);

        return TRUE;
    }
}

struct object *object_get(size_t n, struct object *self, struct object *name)
{
    struct lookup _l = _bind(self, name);

    if (_l.offset == UNDEFINED)
    {
        return UNDEFINED;
    } else
    {
        return _l.rcv->_hd[-1].values[fx(_l.offset)];
    } 
}

struct object *object_new(size_t n, struct object *self)
{
    struct map    *new_map   = (struct map *)send(self->_hd[-1].map, s_new);
    struct object *child     = send(self, s_clone);
    child->_hd[-1].map       = new_map;
    child->_hd[-1].prototype = self;
    return child;
}

struct object *object_set(size_t n, struct object *self, struct object *name, struct object *value)
{
    struct map *new_map;
    struct object *offset = send(self->_hd[-1].map, s_lookup, name);

    if (offset == UNDEFINED)
    {
        assert(object_values_count(self) < object_values_size(self));
        
        new_map = (struct map *)send(self->_hd[-1].map, s_create, name);
        self->_hd[-1].map = new_map;  
        object_values_count_inc(self);
        return self->_hd[-1].values[-object_values_count(self)] = value;
    } else
    {
        return self->_hd[-1].values[fx(offset)] = value;
    } 
}

struct object *symbol_intern(size_t n, struct object *self, char *string)
{
    ssize_t i; 
    struct array *symbols = (struct array *)send(self, s_get, s_symbols);

    for (i = 0; i < fx(symbols->count); ++i)
    {
        if (!strcmp(string, (char *)symbols->indexed_values[i]))
            return symbols->indexed_values[i];
    }

    struct object *new_symbol = send(self, s_new, string);
    send(symbols, s_push, new_symbol);
   
    return new_symbol;
}

struct object *symbol_new(size_t n, struct object *self, char *string)
{
    struct object *new_symbol = send(
        self, 
        s_allocate, 
        ref(0), 
        ref(strlen(string) + 1)
    );
    new_symbol->_hd[-1].map = (struct map *)send(self->_hd[-1].map, s_new);
    new_symbol->_hd[-1].prototype = self;
    strcpy((char *)new_symbol, string);

    return new_symbol;
}

//--------------------------------- Bootstrap ----------------------------------
extern void bootstrap()
{
    printf("Create Root Map\n");
    root_map = object_allocate(
        2,
        NIL, 
        ref(7), 
        ref(7*sizeof(struct property) + sizeof(struct object *))
    ); 
    root_map->_hd[-1].map       = (struct map *)root_map;
    root_map->_hd[-1].prototype = NIL;
    ((struct map *)root_map)->count = ref(0);

    printf("Initializing Root Map\n");
    s_lookup      = object_allocate(2, NIL, ref(0), ref(7));
    map_set(2, (struct map *)root_map, s_lookup, (struct object *)map_lookup);
    s_set         = object_allocate(2, NIL, ref(0), ref(4));
    map_set(2, (struct map *)root_map, s_set, (struct object *)map_set);

    printf("Create implementation symbols\n");
    s_add         = object_allocate(2, NIL, ref(0), ref(4));
    s_allocate    = object_allocate(2, NIL, ref(0), ref(8));
    s_clone       = object_allocate(2, NIL, ref(0), ref(6));
    s_create      = object_allocate(2, NIL, ref(0), ref(7));
    s_delete      = object_allocate(2, NIL, ref(0), ref(7));
    s_get         = object_allocate(2, NIL, ref(0), ref(4));
    s_intern      = object_allocate(2, NIL, ref(0), ref(7));
    s_length      = object_allocate(2, NIL, ref(0), ref(7));
    s_new         = object_allocate(2, NIL, ref(0), ref(4));
    s_push        = object_allocate(2, NIL, ref(0), ref(5));
    s_remove      = object_allocate(2, NIL, ref(0), ref(7));
    s_symbols     = object_allocate(2, NIL, ref(0), ref(8));

    printf("Add primitive methods on Root Map\n");
    send(root_map, s_set, s_clone,    (struct object *)map_clone);
    send(root_map, s_set, s_create,   (struct object *)map_create);
    send(root_map, s_set, s_delete,   (struct object *)map_delete);
    send(root_map, s_set, s_new,      (struct object *)map_new);
    send(root_map, s_set, s_remove,   (struct object *)map_remove);

    printf("Create Root Object\n");
    root_object = object_allocate(2, NIL, ref(20), ref(0)); 
    root_object->_hd[-1].prototype = NIL;
    root_map->_hd[-1].prototype = root_object;

    printf("Create Root Object Map\n");
    root_object->_hd[-1].map = (struct map *)object_allocate(
        2,
        NIL, 
        ref(3), 
        ref(3*sizeof(struct property) + sizeof(struct object *))
    );
    root_object->_hd[-1].map->_hd[-1].prototype = root_map;
    root_object->_hd[-1].map->count = ref(0);

    // For bootstrapping purposes, create properties on the map first
    root_object->_hd[-1].map->_hd[-1].map = root_object->_hd[-1].map;
    send(root_object->_hd[-1].map, s_set, s_allocate, NIL);
    send(root_object->_hd[-1].map, s_set, s_clone,    NIL);
    send(root_object->_hd[-1].map, s_set, s_set,      NIL);
    object_values_count_set((struct object *)root_object->_hd[-1].map, 0);
    object_values_count_set(root_object, 3);

    printf("Create Root Object Map's Map\n");
    struct map *root_object_map_map = (struct map *)object_allocate(
        2,
        NIL, 
        ref(0), 
        ref(sizeof(struct object *))
    );
    root_object_map_map->_hd[-1].prototype = (struct object *)root_object_map_map;
    root_object_map_map->_hd[-1].map = root_object_map_map;
    root_object_map_map->count = ref(0);
    map_values_set_immutable(root_object_map_map);

    root_object->_hd[-1].map->_hd[-1].map = root_object_map_map;


    printf("Add primitive methods on Root Object\n");
    object_set(2, root_object, s_set, (struct object *)object_set);

    send(root_object, s_set, s_allocate, (struct object *)object_allocate);
    send(root_object, s_set, s_clone,    (struct object *)object_clone);
    send(root_object, s_set, s_delete,   (struct object *)object_delete);
    send(root_object, s_set, s_get,      (struct object *)object_get);
    send(root_object, s_set, s_new,      (struct object *)object_new);

    printf("Create Root Array Object\n");
    root_array = send(root_object, s_new);

    printf("Add primitive methods on Root Array\n");
    send(root_array,  s_set, s_delete,   array_delete);
    send(root_array,  s_set, s_get,      array_get);
    send(root_array,  s_set, s_new,      array_new);
    send(root_array,  s_set, s_set,      array_set);
    send(root_array,  s_set, s_push,     array_push);

    printf("Create Root Symbol\n");
    root_symbol = send(root_object, s_new);

    printf("Add string values to symbols\n");
    struct object *symbols = send(root_array, s_new, ref(100));
    send(root_symbol,  s_set, s_symbols, symbols); 

    send(symbols, s_push, s_add);
    send(symbols, s_push, s_allocate);
    send(symbols, s_push, s_clone);
    send(symbols, s_push, s_create);
    send(symbols, s_push, s_delete);
    send(symbols, s_push, s_get);
    send(symbols, s_push, s_intern);
    send(symbols, s_push, s_length);
    send(symbols, s_push, s_lookup);
    send(symbols, s_push, s_new);
    send(symbols, s_push, s_push);
    send(symbols, s_push, s_remove);
    send(symbols, s_push, s_set);
    send(symbols, s_push, s_symbols);

    strcpy((char*)s_add,      "add");
    strcpy((char*)s_allocate, "allocate");
    strcpy((char*)s_clone,    "clone");
    strcpy((char*)s_create,   "create");
    strcpy((char*)s_delete,   "delete");
    strcpy((char*)s_get,      "get");
    strcpy((char*)s_intern,   "intern");
    strcpy((char*)s_length,   "length");
    strcpy((char*)s_lookup,   "lookup");
    strcpy((char*)s_new,      "new");
    strcpy((char*)s_push,     "push");
    strcpy((char*)s_remove,   "remove");
    strcpy((char*)s_set,      "set");
    strcpy((char*)s_symbols,  "symbols");

    printf("Add primitive methods on Root Symbol\n");
    send(root_symbol, s_set, s_intern, symbol_intern);
    send(root_symbol, s_set, s_new,    symbol_new);

    printf("Create Root Function object\n");
    root_function = send(root_object, s_new);

    printf("Add primitive methods on Root Function object\n");
    send(root_function, s_set, s_allocate, function_allocate);
    send(root_function, s_set, s_intern,   function_intern);
    send(root_function, s_set, s_new,      function_new);

    printf("Create Root Fixnum object\n");
    root_fixnum = send(root_object, s_new);

    roots = send(root_array, s_new, ref(20));

    send(roots, s_push, root_array); 
    send(roots, s_push, root_fixnum); 
    send(roots, s_push, root_function); 
    send(roots, s_push, root_map); 
    send(roots, s_push, root_object); 
    send(roots, s_push, root_symbol); 

    roots_names = send(root_array, s_new, ref(20));

    struct object *name = send(root_symbol, s_intern, "array");
    send(roots_names, s_push, name); 
    name = send(root_symbol, s_intern, "fixnum");
    send(roots_names, s_push, name); 
    name = send(root_symbol, s_intern, "function");
    send(roots_names, s_push, name); 
    name = send(root_symbol, s_intern, "map");
    send(roots_names, s_push, name); 
    name = send(root_symbol, s_intern, "object");
    send(roots_names, s_push, name); 
    name = send(root_symbol, s_intern, "symbol");
    send(roots_names, s_push, name); 

    // ---- Minimal support completed! Rest done in JavaScript

    // Redefine Root Map, Root Object and Root Array "set" and "get" methods as
    // well as Root Map "lookup" method to extend the object with an array when
    // no more space left for values and take the extended object when performing
    // a lookup

    // Recompile and replace all methods as Function objects

    // ---- Full bootstrap completed!

    // Add a Root Global object

    // Add support for the rest of the standard library

    // ---- Full JavaScript boostrap completed

    // Serialize the boostrapped image
}
/*
int main()
{
    newHeap();
    bootstrap();
    return 0;
}
*/
