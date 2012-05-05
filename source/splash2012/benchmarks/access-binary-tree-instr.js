/* The Great Computer Language Shootout
   http://shootout.alioth.debian.org/
   contributed by Isaac Gouy */

function TreeNode(left,right,item){
   this.left = left;
   this.right = right;
   this.item = item;
}

TreeNode.prototype.itemCheck = function(){
   if (this.left===null) return this.item;
   else return this.item + this.left.itemCheck() - this.right.itemCheck();
}

/*
function bottomUpTree(item,depth){
   if (depth>0){
      return new TreeNode(
          bottomUpTree(2*item-1, depth-1)
         ,bottomUpTree(2*item, depth-1)
         ,item
      );
   }
   else {
      return new TreeNode(null,null,item);
   }
}
*/

var newTreeNode;
(function () {
    var node = new TreeNode(null, null, null); 

    newTreeNode = function (left,right,item)
    {
        var that = node.__clone__(0);
        that.left  = left;
        that.right = right;
        that.item  = item;
        return that;
    }
})();

function bottomUpTree(item,depth){
    if (depth>0){
        return newTreeNode(
            bottomUpTree(2*item-1, depth-1)
           ,bottomUpTree(2*item, depth-1)
           ,item
        );
    } else
    {
        return newTreeNode(null, null, item);
    }
}

function init()
{
    var ret;

    measurePerformance("inner loop", function () {
    for (var j = 0; j < 400; ++j)
    {
        for ( var n = 4; n <= 7; n += 1 ) {
            var minDepth = 4;
            var maxDepth = Math.max(minDepth + 2, n);
            var stretchDepth = maxDepth + 1;
          
            var check = measurePerformance("check creation",
                function () { return bottomUpTree(0,stretchDepth).itemCheck(); }
            );
           
            var longLivedTree = measurePerformance("longLivedTree creation",
                function () { return bottomUpTree(0,maxDepth); }
            );
            for (var depth=minDepth; depth<=maxDepth; depth+=2){
                var iterations = 1 << (maxDepth - depth + minDepth);
        
                check = 0;
                var t;
                for (var i=1; i<=iterations; i++){
                        t = measurePerformance("bottomUpTree 1", function () {
                          return bottomUpTree(i,depth);
                        });
                        check += measurePerformance("bottomUpTree 1 itemCheck", function () {
                            return t.itemCheck();
                        });

                        t= measurePerformance("bottomUpTree 2", function () {
                          return bottomUpTree(-i,depth);
                        });
                        check += measurePerformance("bottomUpTree 2 itemCheck", function () {
                            return t.itemCheck();
                        });
                }
            }
        
            ret = longLivedTree.itemCheck();
        }
    }
    });
}
init();
reportPerformance();
