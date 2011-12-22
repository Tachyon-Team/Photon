/* _________________________________________________________________________
 *
 *             Tachyon : A Self-Hosted JavaScript Virtual Machine
 *
 *
 *  This file is part of the Tachyon JavaScript project. Tachyon is
 *  distributed at:
 *  http://github.com/Tachyon-Team/Tachyon
 *
 *
 *  Copyright (c) 2011, Universite de Montreal
 *  All rights reserved.
 *
 *  This software is licensed under the following license (Modified BSD
 *  License):
 *
 *  Redistribution and use in source and binary forms, with or without
 *  modification, are permitted provided that the following conditions are
 *  met:
 *    * Redistributions of source code must retain the above copyright
 *      notice, this list of conditions and the following disclaimer.
 *    * Redistributions in binary form must reproduce the above copyright
 *      notice, this list of conditions and the following disclaimer in the
 *      documentation and/or other materials provided with the distribution.
 *    * Neither the name of the Universite de Montreal nor the names of its
 *      contributors may be used to endorse or promote products derived
 *      from this software without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 *  IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 *  TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 *  PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL UNIVERSITE DE
 *  MONTREAL BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 *  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 *  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 *  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 *  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 *  SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * _________________________________________________________________________
 */

/**
@fileOverview
Implementation of ECMAScript 5 array library routines.
*/

(function () {

/**
15.4.3.2 Test if a value is an array
*/
Array.isArray = function (arg)
{
    return arg instanceof Array;
};

// Operations on Array objects.
function array_toString()
{
    return this.join(',');
}

function array_concat()
{
    var len = this.length;

    for (var i=arguments.length-1; i>=0; i--)
    {
        var x = arguments[i];

        len += (x instanceof Array) ? x.length : 1;
    }

    var a = new Array(len);

    for (var i=arguments.length-1; i>=0; i--)
    {
        var x = arguments[i];

        if (x instanceof Array)
        {
            for (var j=x.length-1; j>=0; j--)
                a[--len] = x[j];
        }
        else
        {
            a[--len] = x;
        }
    }

    for (var j=this.length-1; j>=0; j--)
        a[--len] = this[j];

    return a;
}

function array_join(separator)
{
    if (separator === undefined)
        separator = ",";
    else
        separator = separator.toString();
    
    var len = 0;
    var strarray = new Array(this.length);
   
    for (var i = 0; i < this.length; ++i)
    {
        var str = this[i].toString();
        len += str.length;
        strarray[i] = str;
    }
    len += (this.length - 1) * separator.length;

    if (len > 0)
    {
        joinCharArray = new Array(len);
        for (var i = 0, k = 0; i < strarray.length; ++i)
        {
            for (var j = 0; j < strarray[i].length; ++j, ++k)
                joinCharArray[k] = strarray[i].charCodeAt(j);
            if (i < strarray.length - 1)
                for (var j = 0; j < separator.length; ++j, ++k)
                    joinCharArray[k] = separator.charCodeAt(j);
        }
        return String.fromCharCode.apply(null, joinCharArray);
    }
    return "";
}

function array_pop()
{
    var len = this.length;

    if (len === 0)
        return undefined;

    var result = this[len-1];

    //delete this[len-1];
    this[len-1] = undefined;

    this.length = len-1;

    return result;
}

function array_push()
{
    var len = this.length;

    for (var i=0; i<arguments.length; i++)
        this[len+i] = arguments[i];

    return this.length;
}

function array_reverse()
{
    // This implementation of reverse assumes that no element of the
    // array is deleted.

    var len = this.length;
    var lo = 0;
    var hi = len - 1;

    while (lo < hi)
    {
        var tmp = this[hi];
        this[hi] = this[lo];
        this[lo] = tmp;
        lo++;
        hi--;
    }

    return this;
}

function array_shift()
{
    // This implementation of shift assumes that no element of the
    // array is deleted.
    var len = this.length;

    if (len === 0)
        return undefined;

    var first = this[0];

    for (var i=1; i<len; i++)
        this[i-1] = this[i];

    //delete this[len-1];
    this[len-1] = undefined;
    this.length = len-1;

    return first;
}

function array_slice(start, end)
{
    var len = this.length;

    if (start === undefined)
        start = 0;
    else
    {
        if (start < 0)
        {
            start = len + start;
            if (start < 0)
                start = 0;
        }
        else if (start > len)
            start = len;
    }

    if (end === undefined)
        end = len;
    else
    {
        if (end < 0)
        {
            end = len + end;
            if (end < start)
                end = start;
        }
        else if (end < start)
            end = start;
        else if (end > len)
            end = len;
    }

    var n = end - start;
    var a = new Array(n);

    for (var i=n-1; i>=0; i--)
        a[i] = this[start+i];

    return a;
}

function array_sort(comparefn)
{
    var len = this.length;

    if (comparefn === undefined)
        comparefn = array_sort_comparefn_default;

    /* Iterative mergesort algorithm */

    if (len >= 2)
    {
        /* Sort pairs in-place */

        for (var start=((len-2)>>1)<<1; start>=0; start-=2)
        {
            if (comparefn(this[start], this[start+1]) > 0)
            {
                var tmp = this[start];
                this[start] = this[start+1];
                this[start+1] = tmp;
            }
        }

        if (len > 2)
        {
            /*
             * For each k>=1, merge each pair of groups of size 2^k to
             * form a group of size 2^(k+1) in a second array.
             */

            var a1 = this;
            var a2 = new Array(len);

            var k = 1;
            var size = 2;

            do
            {
                var start = ((len-1)>>(k+1))<<(k+1);
                var j_end = len;
                var i_end = start+size;

                if (i_end > len)
                    i_end = len;

                while (start >= 0)
                {
                    var i = start;
                    var j = i_end;
                    var x = start;

                    for (;;)
                    {
                        if (i < i_end)
                        {
                            if (j < j_end)
                            {
                                if (comparefn(a1[i], a1[j]) > 0)
                                    a2[x++] = a1[j++];
                                else
                                    a2[x++] = a1[i++];
                            }
                            else
                            {
                                while (i < i_end)
                                    a2[x++] = a1[i++];
                                break;
                            }
                        }
                        else
                        {
                            while (j < j_end)
                                a2[x++] = a1[j++];
                            break;
                        }
                    }

                    j_end = start;
                    start -= 2*size;
                    i_end = start+size;
                }

                var t = a1;
                a1 = a2;
                a2 = t;

                k++;
                size *= 2;
            } while (len > size);

            if ((k & 1) === 0)
            {
                /* Last merge was into second array, so copy it back to this. */

                for (var i=len-1; i>=0; i--)
                    this[i] = a1[i];
            }
        }
    }

    return this;
}

function array_sort_comparefn_default(x, y)
{
    if (String(x) > String(y))
        return 1;
    else
        return -1;
}

function array_splice(start, deleteCount)
{
    var len = this.length;

    if (start === undefined)
        start = len;
    else
    {
        if (start < 0)
        {
            start = len + start;
            if (start < 0)
                start = 0;
        }
        else if (start > len)
            start = len;
    }

    if (deleteCount === undefined)
        deleteCount = len - start;
    else
    {
        if (deleteCount < 0)
            deleteCount = 0;
        else if (deleteCount > len - start)
            deleteCount = len - start;
    }

    var itemCount = arguments.length - 2;

    if (itemCount < 0)
        itemCount = 0;

    var adj = itemCount - deleteCount;
    var deleteEnd = start + deleteCount;

    var result = this.slice(start, deleteEnd);

    if (adj < 0)
    {
        for (var i=deleteEnd; i<len; i++)
            this[i+adj] = this[i];
        for (var i=len+adj; i<len; i++)
            this[i] = undefined;
        this.length = len+adj;
    }
    else if (adj > 0)
    {
        for (var i=len-1; i>=deleteEnd; i--)
            this[i+adj] = this[i];
    }

    for (var i=itemCount-1; i>=0; i--)
        this[start+i] = arguments[2+i];

    return result;
}

function array_unshift()
{
    var len = this.length;
    var argCount = arguments.length;

    if (argCount > 0)
    {
        for (var i=len-1; i>=0; i--)
            this[i+argCount] = this[i];
        for (var i=argCount-1; i>=0; i--)
            this[i] = arguments[i];
    }

    return len + argCount;
}

function array_indexOf(searchElement, fromIndex)
{
    var len = this.length;

    if (arguments.length <= 1)
        fromIndex = 0;
    else
    {
        if (fromIndex < 0)
        {
            fromIndex = len + fromIndex;
            if (fromIndex < 0)
                fromIndex = 0;
        }
    }

    for (var i=fromIndex; i<len; i++)
        if (this[i] === searchElement)
            return i;

    return -1;
}

function array_lastIndexOf(searchElement, fromIndex)
{
    var len = this.length;

    if (arguments.length <= 1 || fromIndex >= len)
        fromIndex = len-1;
    else if (fromIndex < 0)
        fromIndex = len + fromIndex;

    for (var i=fromIndex; i>=0; i--)
        if (this[i] === searchElement)
            return i;

    return -1;
}

function array_forEach(callbackfn, thisArg)
{
    var len = this.length;

    for (var i=0; i<len; i++)
        callbackfn.call(thisArg, this[i], i, this);
}

function array_map(callbackfn, thisArg)
{
    var len = this.length;

    var a = new Array(len);

    for (var i=0; i<len; i++)
    {
        a[i] = callbackfn.call(thisArg, this[i], i, this);
    }

    return a;
}

function array_filter(callbackfn, thisArg)
{
    var len = this.length;

    var a = [];

    for (var i=0; i<len; i++)
    {
        var x = this[i];
        if (callbackfn.call(thisArg, x, i, this))
            a.push(x);
    }

    return a;
}

// Setup Array.prototype .

Array.prototype.toString    = array_toString;
Array.prototype.concat      = array_concat;
Array.prototype.join        = array_join;
Array.prototype.pop         = array_pop;
Array.prototype.push        = array_push;
Array.prototype.reverse     = array_reverse;
Array.prototype.shift       = array_shift;
Array.prototype.slice       = array_slice;
Array.prototype.sort        = array_sort;
Array.prototype.splice      = array_splice;
Array.prototype.unshift     = array_unshift;
Array.prototype.indexOf     = array_indexOf;
Array.prototype.lastIndexOf = array_lastIndexOf;
Array.prototype.forEach     = array_forEach;
Array.prototype.map         = array_map;
Array.prototype.filter      = array_filter;

})();

//-----------------------------------------------------------------------------
