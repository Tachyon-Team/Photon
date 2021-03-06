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
Implementation of constant propagation.

@author
Maxime Chevalier-Boisvert
*/

//=============================================================================
//
// Implementation of Sparse Conditional Constant Propagation (SCCP)
//
//=============================================================================

// Constant for values not yet known
var TOP = 'TOP';

// Constant for value known to be non-constant
var BOT = 'BOT';

/**
Perform sparse conditional constant propagation on a CFG
*/
function constProp(cfg, params)
{
    assert (
        params instanceof CompParams,
        'expected compilation parameters'
    );

    // Get the value of a constant use or instruction
    function getValue(val)
    {
        // If the value is a constant, return it directly
        if (val instanceof ConstValue)
        {
            return val;
        }
        else
        {
            // Get the current value we have for the instruction
            var curVal = instrVals[val.instrId];

            // Follow the chain of instruction replacement values until
            // a non-instruction replacement value is found
            while (
                curVal instanceof IRInstr && 
                instrVals[curVal.instrId] instanceof IRValue
            )
            {
                curVal = instrVals[curVal.instrId];
            }

            return curVal;
        }
    }

    // Test if a basic block is reachable
    function isReachable(block)
    {
        return (reachable[block.blockId] === true);
    }

    // Test if an edge was visited
    function edgeReachable(pred, succ)
    {
        return (edgeVisited[pred.blockId][succ.blockId] === true);
    }

    // Queue a CFG edge into the CFG work list
    function queueEdge(branchInstr, succBlock)
    {
        var predBlock = branchInstr.parentBlock;
        cfgWorkList.push({pred: predBlock, succ:succBlock});
    }

    // Evaluate an SSA instruction
    function evalInstr(instr)
    {
        // If there is a const prop function for this instruction, use it
        if (instr.constEval !== undefined)
        {
            var val = instr.constEval(getValue, edgeReachable, queueEdge, params);

            return val;
        }

        // Otherwise, if this instruction is a generic branch
        else if (instr.isBranch())
        {
            // Put all branches on the CFG work list
            for (var i = 0; i < instr.targets.length; ++i)
            {
                if (instr.targets[i])
                    queueEdge(instr, instr.targets[i]);
            }
        }

        // By default, return the non-constant value
        return BOT;
    }
    
    // List of CFG blocks to be processed
    var cfgWorkList = [];

    // List of SSA edges to be processed
    var ssaWorkList = [];

    // Reachable blocks, indexed by block id
    var reachable = [];

    // Visited edges, indexed by predecessor id, successor id
    var edgeVisited = [];

    // Instruction values, indexed by instr id
    var instrVals = [];

    // Initialize all edges to unvisited
    for (var itr = cfg.getBlockItr(); itr.valid(); itr.next())
        edgeVisited[itr.get().blockId] = [];
    for (var itr = cfg.getEdgeItr(); itr.valid(); itr.next())
        edgeVisited[itr.get().pred.blockId][itr.get().succ.blockId] = undefined;

    // Initialize all instruction values to top
    for (var itr = cfg.getInstrItr(); itr.valid(); itr.next())
        instrVals[itr.get().instrId] = TOP;

    // Add the entry block to the CFG work list
    cfgWorkList.push({pred: cfg.entry, succ:cfg.entry});
    edgeVisited[cfg.entry.blockId][cfg.entry.blockId] = undefined;

    // Until a fixed point is reached
    while (cfgWorkList.length > 0 || ssaWorkList.length > 0)
    {
        // Until the CFG work list is processed
        while (cfgWorkList.length > 0)
        {
            // Remove an edge from the work list
            var edge = cfgWorkList.pop();
            var pred = edge.pred;
            var succ = edge.succ;

            // Test if this edge has already been visited
            var firstEdgeVisit = (edgeVisited[pred.blockId][succ.blockId] !== true);

            // If this is not the first visit of this edge, do nothing
            if (!firstEdgeVisit)
                continue;

            // Test if this is the first visit to this block
            var firstVisit = (reachable[succ.blockId] !== true);

            //print('iterating cfg: ' + succ.getBlockName() + (firstVisit? ' (first visit)':''));

            // Mark the edge as visited
            edgeVisited[pred.blockId][succ.blockId] = true;

            // Mark the successor block as reachable
            reachable[succ.blockId] = true;

            // For each instruction in the successor block
            for (var i = 0; i < succ.instrs.length; ++i)
            {
                var instr = succ.instrs[i];

                // If this is not a phi node and this is not the first visit,
                // do not revisit non-phi instructions
                if (!(instr instanceof PhiInstr) && !firstVisit)
                    break;

                //print('visiting: ' + instr);

                // Evaluate the instruction
                instrVals[instr.instrId] = evalInstr(instr);

                // For each dest of the instruction
                for (var j = 0; j < instr.dests.length; ++j)
                {
                    var dest = instr.dests[j];

                    // If the block of the destination is reachable
                    if (reachable[dest.parentBlock.blockId] === true)
                    {
                        // Add the dest to the SSA work list
                        ssaWorkList.push(dest);
                    }
                }
            }
        }

        // Until the SSA work list is processed
        while (ssaWorkList.length > 0)
        {
            // Remove an edge from the SSA work list
            var v = ssaWorkList.pop();

            // Evaluate the value of the edge dest
            var t = evalInstr(v);

            //print('iterating ssa: ' + v + ' ==> ' + t);

            // If the instruction value has changed
            //if (t !== instrVals[v.instrId])
            if (t !== getValue(v))
            {
                //print('value changed: ' + v + ' ==> ' + t);

                // Update the value for this instruction
                instrVals[v.instrId] = t;
                
                // For each dest of v
                for (var i = 0; i < v.dests.length; ++i)
                {
                    var dest = v.dests[i];

                    // If the block of the destination is reachable
                    if (reachable[dest.parentBlock.blockId] === true)
                    {
                        // Add the dest to the SSA work list
                        ssaWorkList.push(dest);
                    }
                }
            }
        }
    }
    
    var numConsts = 0;
    var numBranches = 0;

    // For each block in the CFG
    for (var i = 0; i < cfg.blocks.length; ++i)
    {
        var block = cfg.blocks[i];

        //print('processing: ' + block.getBlockName());

        // If this block is not reachable, skip it
        if (!isReachable(block))
        {
            //print('unreachable: ' + block.getBlockName());
            continue;
        }

        // For each instruction in the block
        for (var j = 0; j < block.instrs.length; ++j)
        {
            var instr = block.instrs[j];

            //print(instr);

            // Get the value for this instruction
            var val = getValue(instr);

            //print('\tval: ' + val);

            // If this is an if instruction
            if (instr instanceof IfInstr)
            {
                // If only one if branch is reachable, replace the if by a jump
                if (val === true)
                {
                    block.replInstrAtIndex(j, new JumpInstr(instr.targets[0]));
                    ++numBranches;
                }
                else if (val === false)
                {
                    block.replInstrAtIndex(j, new JumpInstr(instr.targets[1]));
                    ++numBranches;
                }
            }

            // If this is an arithmetic instruction with overflow 
            // and we have a replacement value
            else if (instr instanceof ArithOvfInstr && val instanceof IRValue)
            {
                //print(instr + ' ==> ' + val);
                //print(instr.parentBlock.parentCFG.ownerFunc.funcName);

                // Replace the instruction by a jump to the normal branch
                block.replInstrAtIndex(j, new JumpInstr(instr.targets[0]), val);
                ++numBranches;
            }

            // If there is a constant value for this instruction
            else if (val instanceof ConstValue)
            {
                //print(instr + ' ==> ' + val);

                // Replace the instruction by the constant value
                block.replInstrAtIndex(j, undefined, val);
                --j;
            }

            // If there is a replacement instruction value for this instruction
            else if (val instanceof IRValue && val !== instr)
            {
                //print(instr + ' ==> ' + val);

                // Remap the dests to the replacement instruction
                for (var k = 0; k < instr.dests.length; ++k)
                {
                    var dest = instr.dests[k];

                    dest.replUse(instr, val);
                    val.addDest(dest);
                }

                // Remove the instruction
                block.remInstrAtIndex(j, val);
                --j;
            }
        }
    }

    //print('Constants found: ' + numConsts);
    //print('Branches found: ' + numBranches);

    // Remove basic blocks which are now unreachable from the CFG
    cfg.remDeadBlocks();
}

//=============================================================================
//
// Constant propagation functions for IR instructions
//
//=============================================================================

PhiInstr.prototype.constEval = function (getValue, edgeReachable, queueEdge, params)
{
    var curVal;

    // For each incoming value
    for (var i = 0; i < this.uses.length; ++i)
    {
        var useVal = getValue(this.uses[i]);
        var pred = this.preds[i];

        // If the edge from the predecessor is not executable, ignore its value
        if (edgeReachable(pred, this.parentBlock) !== true)
            continue;

        //print('incoming: ' + this.uses[i] + ' ==> ' + useVal);

        // If any use is still top, the current value is unknown
        if (useVal === TOP)
            return TOP;

        // If not all uses have the same value, return the non-constant value
        if (useVal !== curVal && curVal !== undefined)
            return BOT;

        curVal = useVal;
    }

    // All uses have the same constant value
    return curVal;
};

ArithInstr.genConstEval = function (opFunc, genFunc)
{
    function constEval(getValue, edgeReachable, queueEdge, params)
    {
        var v0 = getValue(this.uses[0]);
        var v1 = getValue(this.uses[1]);

        if (v0 === TOP || v1 === TOP)
            return TOP;

        if (v0 instanceof ConstValue && v0.isNumber() &&
            v1 instanceof ConstValue && v1.isNumber())
        {
            if (v0.isInt() && v1.isInt())
            {
                v0 = v0.getImmValue(params);
                v1 = v1.getImmValue(params);
            }
            else
            {
                v0 = v0.value;
                v1 = v1.value;
            }

            var result = opFunc(v0, v1, this.type);

            if (this.type === IRType.box)
                result = num_shift(result, -params.staticEnv.getBinding('TAG_NUM_BITS_INT').value);

            // If there was no overflow, return the result
            if (this.type.valInRange(result, params))
            {
                return ConstValue.getConst(
                    result,
                    this.type
                );
            }
        }

        if (genFunc !== undefined)
        {           
            var u0 = (v0 instanceof ConstValue)? v0:this.uses[0];
            var u1 = (v1 instanceof ConstValue)? v1:this.uses[1];

            return genFunc(u0, u1, this.type);
        }

        // By default, return the unknown value
        return BOT;
    }

    return constEval;
};

AddInstr.prototype.constEval = ArithInstr.genConstEval(
    function (v0, v1)
    {
        return num_add(v0, v1);
    },
    function (u0, u1)
    {
        if (u0 instanceof ConstValue && num_eq(u0.value, 0))
            return u1;

        if (u1 instanceof ConstValue && num_eq(u1.value, 0))
            return u0;

        return BOT;
    }
);

SubInstr.prototype.constEval = ArithInstr.genConstEval(
    function (v0, v1)
    {
        return num_sub(v0, v1);
    },
    function (u0, u1)
    {
        if (u1 instanceof ConstValue && num_eq(u1.value, 0))
            return u0;

        return BOT;
    }
);

MulInstr.prototype.constEval = ArithInstr.genConstEval(
    function (v0, v1)
    {
        return num_mul(v0, v1);
    },
    function (u0, u1, outType)
    {
        if (u0 instanceof ConstValue && num_eq(u0.value, 1))
            return u1;

        if (u1 instanceof ConstValue && num_eq(u1.value, 1))
            return u0;

        if (((u0 instanceof ConstValue && num_eq(u0.value, 0)) || 
             (u1 instanceof ConstValue && num_eq(u1.value, 0))) &&
            u0.type === u1.type)
        {
            return ConstValue.getConst(
                0,
                outType
            );
        }

        return BOT;
    }
);

DivInstr.prototype.constEval = ArithInstr.genConstEval(
    function (v0, v1, type)
    {
        var res = num_div(v0, v1);

        if (type.isInt() || type === IRType.box)
        {
            if (num_gt(res, 0))
                return Math.floor(res);
            else
                return Math.ceil(res);
        }

        return res;
    },
    function (u0, u1)
    {
        if (u1 instanceof ConstValue && num_eq(u1.value, 1))
            return u0;

        return BOT;
    }
);

ModInstr.prototype.constEval = ArithInstr.genConstEval(
    function (v0, v1, type)
    {
        if (type.isInt() && (num_lt(v0, 0) || num_lt(v1, 0)))
            return NaN;

        return num_mod(v0, v1);
    }
);

BitOpInstr.genConstEval = function (opFunc, genFunc)
{
    function constEval(getValue, edgeReachable, queueEdge, params)
    {
        var v0 = getValue(this.uses[0]);
        var v1 = getValue(this.uses[1]);

        if (v0 === TOP || v1 === TOP)
            return TOP;

        // If both values are constant integers
        if (v0 instanceof ConstValue && 
            v1 instanceof ConstValue &&
            v0.isInt() && v1.isInt() &&
            !(v0.type === IRType.box && !v0.isBoxInt(params)) &&
            !(v1.type === IRType.box && !v1.isBoxInt(params))
        )
        {
            v0 = v0.getImmValue(params);
            v1 = v1.getImmValue(params);

            // If both values fit in the int32 range
            if (IRType.i32.valInRange(v0, params) &&
                IRType.i32.valInRange(v1, params))
            {
                var result = opFunc(v0, v1, this.type, params);

                if (this.type === IRType.box)
                    result = num_shift(result, -params.staticEnv.getBinding('TAG_NUM_BITS_INT').value);

                // If the result is within the range of the output type, return it
                if (this.type.valInRange(result, params))
                {
                    return ConstValue.getConst(
                        result,
                        this.type
                    );
                }
            }
        }

        if (genFunc !== undefined)
        {
            var u0 = (v0 instanceof ConstValue)? v0:this.uses[0];
            var u1 = (v1 instanceof ConstValue)? v1:this.uses[1];

            return genFunc(u0, u1, this.type, params);
        }

        // By default, return the unknown value
        return BOT;
    }

    return constEval;
};

NotInstr.prototype.constEval = function (getValue, edgeReachable, queueEdge, params)
{
    var v0 = getValue(this.uses[0]);

    if (v0 === TOP)
        return TOP;


    // TODO: currently disabled because the backend can't support it
    return BOT;



    // If the operand is a constant integer
    if (v0 instanceof ConstValue && v0.isInt() &&
        !(v0.type === IRType.box && !v0.isBoxInt(params))
    )
    {
        v0 = v0.getImmValue(params);

        // If the operand fits in the int32 range
        if (IRType.i32.valInRange(v0, params))
        {
            var result = num_not(v0);

            /*
            print('input: ' + v0);
            print('result: ' + result);
            */

            if (this.type === IRType.box)
                result = num_shift(result, -params.staticEnv.getValue('TAG_NUM_BITS_INT'));

            // If the output type is unsigned, make the result positive
            if (this.type.isUnsigned() && num_lt(result, 0))
                result = num_add(num_shift(2, this.type.getSizeBits() - 1), result);

            // If the result is within the range of the output type, return it
            if (this.type.valInRange(result, params))
            {
                return ConstValue.getConst(
                    result,
                    this.type
                );
            }
        }
    }

    // By default, return the unknown value
    return BOT;
}

AndInstr.prototype.constEval = BitOpInstr.genConstEval(
    function (v0, v1)
    {
        return num_and(v0, v1);
    },
    function (u0, u1, outType, params)
    {
        var TAG_INT_MASK = params.staticEnv.getBinding('TAG_INT_MASK').value;
        var TAG_REF_MASK = params.staticEnv.getBinding('TAG_REF_MASK').value;

        if ((u0 instanceof ConstValue && num_eq(u0.value, 0)) ||
            (u1 instanceof ConstValue && num_eq(u1.value, 0)))
        {
            return ConstValue.getConst(
                0,
                outType
            );
        }

        if (u0 instanceof ConstValue &&
            u1 instanceof ConstValue &&
            u0.type === IRType.box &&
            !u0.isBoxInt(params) &&
            u1.type === IRType.pint && 
            num_eq(u1.value, TAG_REF_MASK))
        {
            return ConstValue.getConst(
                u0.getTagBits(params),
                IRType.pint
            );
        }

        if (u0 instanceof ConstValue &&
            u1 instanceof ConstValue &&
            u1.type === IRType.box &&
            !u1.isBoxInt(params) &&
            u0.type === IRType.pint && 
            num_eq(u0.value, TAG_REF_MASK))
        {
            return ConstValue.getConst(
                u1.getTagBits(params),
                IRType.pint
            );
        }

        if (u0 instanceof ConstValue &&
            u1 instanceof ConstValue &&
            u0.type === IRType.box &&
            u1.type === IRType.pint && 
            num_eq(u1.value, TAG_INT_MASK))
        {
            return ConstValue.getConst(
                num_and(u0.getTagBits(params), TAG_INT_MASK),
                IRType.pint
            );
        }

        if (u0 instanceof ConstValue &&
            u1 instanceof ConstValue &&
            u1.type === IRType.box &&
            u0.type === IRType.pint && 
            num_eq(u0.value, TAG_INT_MASK))
        {
            return ConstValue.getConst(
                num_and(u1.getTagBits(params), TAG_INT_MASK),
                IRType.pint
            );
        }

        return BOT;
    }
);

OrInstr.prototype.constEval = BitOpInstr.genConstEval(
    function (v0, v1)
    {
        return num_or(v0, v1);
    },
    function (u0, u1, type)
    {
        if (u0 instanceof ConstValue && num_eq(u0.value, 0))
            return u1;

        if (u1 instanceof ConstValue && num_eq(u1.value, 0))
            return u0;

        return BOT;
    }
);

XorInstr.prototype.constEval = BitOpInstr.genConstEval(
    function (v0, v1)
    {
        return num_xor(v0, v1);
    }
);

LsftInstr.prototype.constEval = BitOpInstr.genConstEval(
    function (v0, v1)
    {
        return num_shift(v0, v1);
    },
    function (u0, u1, type)
    {
        if (u1 instanceof ConstValue && num_eq(u1.value, 0))
            return u0;

        return BOT;
    }
);

RsftInstr.prototype.constEval = BitOpInstr.genConstEval(
    function (v0, v1)
    {
        return num_shift(v0, -v1);
    },
    function (u0, u1, type)
    {
        if (u1 instanceof ConstValue && num_eq(u1.value, 0))
            return u0;

        return BOT;
    }
);

UrsftInstr.prototype.constEval = BitOpInstr.genConstEval(
    function (v0, v1, type, params)
    {
        return num_urshift(v0, v1, type.getSizeBits(params));
    },
    function (u0, u1, type)
    {
        if (u1 instanceof ConstValue && num_eq(u1.value, 0))
            return u0;

        return BOT;
    }
);

ICastInstr.prototype.constEval = function (getValue, edgeReachable, queueEdge, params)
{
    if (this.uses[0].type === this.type)
        return this.uses[0];

    var v0 = getValue(this.uses[0]);

    if (v0 === TOP)
        return TOP;

    if (v0 instanceof ConstValue)
    {
        var result;

        if (v0.type.isInt() && this.type.isInt())
        {
            if (this.type.valInRange(v0.value, params))
                result = v0.value;
        }

        else if (v0.type === IRType.box && v0.isInt() && this.type.isInt())
        {
            var castVal = v0.getImmValue(params);
            
            if (this.type.valInRange(castVal, params))
                result = castVal;
        }

        else if (v0.type.isInt() && this.type === IRType.box)
        {
            var TAG_NUM_BITS_INT = params.staticEnv.getBinding('TAG_NUM_BITS_INT').value;
            var TAG_INT_MASK = params.staticEnv.getBinding('TAG_INT_MASK').value;
            var TAG_INT = params.staticEnv.getBinding('TAG_INT').value;

            // If the tag bits correspond to a boxed integer
            if (num_and(v0.value, TAG_INT_MASK) === TAG_INT)
            {
                var castVal = num_shift(v0.value, -TAG_NUM_BITS_INT);

                if (this.type.valInRange(castVal, params))
                    result = castVal;
            }
        }

        if (result !== undefined)
        {
            return ConstValue.getConst(
                result,
                this.type
            );
        }
    }

    return BOT;
};

ArithOvfInstr.genConstEval = function (opFunc, genFunc)
{
    function constEval(getValue, edgeReachable, queueEdge, params)
    {
        var v0 = getValue(this.uses[0]);
        var v1 = getValue(this.uses[1]);

        if (v0 === TOP || v1 === TOP)
        {
            return TOP;
        }

        if (v0 instanceof ConstValue && v0.isNumber() &&
            v1 instanceof ConstValue && v1.isNumber())
        {
            if (v0.isInt() && v1.isInt())
            {
                v0 = v0.getImmValue(params);
                v1 = v1.getImmValue(params);
            }
            else
            {
                v0 = v0.value;
                v1 = v1.value;
            }

            var result = opFunc(v0, v1);

            if (this.type === IRType.box)
                result = num_shift(result, -params.staticEnv.getBinding('TAG_NUM_BITS_INT').value);

            // If there was no overflow
            if (this.type.valInRange(result, params))
            {
                // Add the normal (non-overflow) branch to the work list
                queueEdge(this, this.targets[0]);

                // Return the result
                return ConstValue.getConst(
                    result,
                    this.type
                );
            }
        }

        if (genFunc !== undefined)
        {
            var u0 = (v0 instanceof ConstValue)? v0:this.uses[0];
            var u1 = (v1 instanceof ConstValue)? v1:this.uses[1];

            var result = genFunc(u0, u1, this.type);

            if (result !== BOT)
            {
                // Add the normal (non-overflow) branch to the work list
                queueEdge(this, this.targets[0]);

                return result;
            }
        }

        // By default, both branches are reachable (an overflow could occur)
        queueEdge(this, this.targets[0]);
        queueEdge(this, this.targets[1]);

        // By default, return the unknown value
        return BOT;
    }

    return constEval;
};

AddOvfInstr.prototype.constEval = ArithOvfInstr.genConstEval(
    function (v0, v1)
    {
        return num_add(v0, v1);
    },
    function (u0, u1)
    {
        if (u0 instanceof ConstValue && num_eq(u0.value, 0))
            return u1;

        if (u1 instanceof ConstValue && num_eq(u1.value, 0))
            return u0;

        return BOT;
    }
);

SubOvfInstr.prototype.constEval = ArithOvfInstr.genConstEval(
    function (v0, v1)
    {
        return num_sub(v0, v1);
    },
    function (u0, u1)
    {
        if (u1 instanceof ConstValue && num_eq(u1.value, 0))
            return u0;

        return BOT;
    }
);

MulOvfInstr.prototype.constEval = ArithOvfInstr.genConstEval(
    function (v0, v1)
    {
        return num_mul(v0, v1);
    },
    function (u0, u1, outType)
    {
        if (u0 instanceof ConstValue && num_eq(u0.value, 1))
            return u1;

        if (u1 instanceof ConstValue && num_eq(u1.value, 1))
            return u0;

        if (((u0 instanceof ConstValue && num_eq(u0.value, 0)) ||
             (u1 instanceof ConstValue && num_eq(u1.value, 0))) &&
            u0.type === u1.type)
        {
            return ConstValue.getConst(
                0,
                outType
            );
        }

        return BOT;
    }
);

LsftOvfInstr.prototype.constEval = ArithOvfInstr.genConstEval(
    function (v0, v1)
    {
        return num_shift(v0, v1);
    }
);

function constEvalBool(val)
{
    // If the test is a constant
    if (val instanceof ConstValue)
    {
        // If the test evaluates to true
        if (
            val.value === true ||
            (val.isNumber() && num_ne(val.value, 0)) ||
            (val.isString() && val.value !== '')
        )
        {
            return ConstValue.getConst(true);
        }

        // If the test evaluates to false
        else if (
            val.value === false ||
            val.value === null ||
            val.value === undefined ||
            val.value === '' ||
            num_eq(val.value, 0)
        )
        {
            return ConstValue.getConst(false);
        }
    }

    // Return the non-constant value
    return BOT;
}

CallFuncInstr.prototype.constEval = function (getValue, edgeReachable, queueEdge, params)
{
    // If this is a call to boxToBool
    if (this.getCallee() instanceof IRFunction && 
        this.getCallee() === params.staticEnv.getBinding('boxToBool'))
    {
        // Evaluate the boolean value
        var boolVal = constEvalBool(getValue(this.uses[this.uses.length-1]));

        // If we could evaluate the boolean value, return it
        if (boolVal instanceof ConstValue)
            return boolVal;
    }

    // Add all branch targets to the CFG work list
    for (var i = 0; i < this.targets.length; ++i)
        if (this.targets[i])
            queueEdge(this, this.targets[i]);

    return BOT;
};

IfInstr.prototype.constEval = function (getValue, edgeReachable, queueEdge, params)
{
    var v0 = getValue(this.uses[0]);
    var v1 = getValue(this.uses[1]);

    // Comparison test value, by default, it is unknown (bottom)
    var testVal = BOT;

    if (v0 === TOP || v1 === TOP)
        testVal = TOP;

    if (v0 instanceof ConstValue && v1 instanceof ConstValue)
    {
        v0 = v0.value;
        v1 = v1.value;

        // If this is a number comparison
        if (num_instance(v0) && num_instance(v1))
        {
            switch (this.testOp)
            {
                case 'LT': testVal = num_lt(v0, v1); break;
                case 'LE': testVal = num_le(v0, v1); break;
                case 'GT': testVal = num_gt(v0, v1); break;
                case 'GE': testVal = num_ge(v0, v1); break;
                case 'EQ': testVal = num_eq(v0, v1); break;
                case 'NE': testVal = num_ne(v0, v1); break;
            }
        }

        // If this is a boolean or string comparison
        if ((typeof v0 === 'boolean' && typeof v1 === 'boolean') ||
            (typeof v0 === 'string' && typeof v1 === 'string'))
        {
            switch (this.testOp)
            {
                case 'EQ': testVal = (v0 === v1); break;
                case 'NE': testVal = (v0 !== v1); break;
            }
        }
    }

    //print(testVal);

    // If the test evaluates to true
    if (testVal === true)
    {
        // Add the true branch to the work list
        queueEdge(this, this.targets[0]);
    }

    // If the test evaluates to false
    else if (testVal === false)
    {
        // Add the false branch to the work list
        queueEdge(this, this.targets[1]);
    }

    // If test is non-constant, both branches are reachable
    else if (testVal === BOT)
    {
        queueEdge(this, this.targets[0]);
        queueEdge(this, this.targets[1]);
    }

    // Return the test value
    return testVal;
}

