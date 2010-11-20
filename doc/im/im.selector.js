/* -------------------------------------------------------
//////////////////////////////////////////////////////////
im.selector.js - simple css selector engine

Supports the following type of selectors:
"div"
"div.foo"
"div.foo.bar"
"div *"
"div.foo span"
"div.foo > span"
"div, span, p"
"#id span.button"

Or any combination of the above.

IMPORTANT LIMITATION: #id just does a doc.getElementById, 
so it will not check the location in the DOM!
//////////////////////////////////////////////////////////
------------------------------------------------------- */
(function(im){
    
    /* ---------------------------------------------------------------------------
    --------------------------------------------------------------------------- */
    var AXISALL = 0;
    var AXISCHILD = 1;
    
    var bitCache = {};

    /* ---------------------------------------------------------------------------
    --------------------------------------------------------------------------- */
    var parseSelector = function(selector) {
        var joins = selector.split(',');
        var jl = joins.length;
        
        while (jl--) {
            joins[jl] = joins[jl].split(' ');
        }
        
        return joins;
    };
    
    /* ---------------------------------------------------------------------------
    --------------------------------------------------------------------------- */
    var hasClasses = function(className, classes, regex) {
        var l = classes.length;
        while (l--) {
            if (!regex[l].test(className)) return false;
        }
        return true;
    };
    
    /* ---------------------------------------------------------------------------
    --------------------------------------------------------------------------- */
    var makeHasClassesRegexes = function(classes) {
        var r = [];
        var l = classes.length;
        while (l--) {
            r.push(new RegExp("(^|\\s)" + classes[l] + "(\\s|$)"));
        }
        return r;
    };
    
    /* ---------------------------------------------------------------------------
    --------------------------------------------------------------------------- */
    var parseSelectionBit = function(bit) {
        var parts = bit.split('.');
        var nodeName = parts.shift();
        var remains = !!(parts.length > 0);
        
        return {
            nodeName : nodeName == '' ? '*' : nodeName.toUpperCase(),
            classNames : remains ? parts : null,
            classNamesRegexes : remains ? makeHasClassesRegexes(parts) : null
        };
    };
    
    /* ---------------------------------------------------------------------------
    --------------------------------------------------------------------------- */
    var getContexts = function(currentContexts, axis, selection) {
        var result = [];
        var nodeName = selection.nodeName;
        
        var classNames = selection.classNames;
        var regex = selection.classNamesRegexes;
        var _hasClasses = hasClasses;
        
        var cl = currentContexts.length;
        if (axis == AXISCHILD) {
            for (var x = 0; x < cl; x++) {
                var context = currentContexts[x];
                var n = context.firstChild;
                for ( ; n; n = n.nextSibling) {
                    if (n.nodeType == 1 && (nodeName == '*' || nodeName == n.nodeName)) {
                        if (classNames) {
                            var c = n.className;
                            if (!c) continue;
                            if (_hasClasses(c, classNames, regex)) result.push(n);
                        } else {
                            result.push(n);
                        }
                    }
                }
            }
        } else {
            for (var x = 0; x < cl; x++) {
                var context = currentContexts[x];
                var nodes = context.getElementsByTagName(nodeName);
                var l = nodes.length;
                for (var y = 0; y < l; y++) {
                    if (classNames) {
                        var n = nodes[y], c = n.className;
                        if (!c) continue;
                        if (_hasClasses(c, classNames, regex)) result.push(n);
                    } else {
                        result.push(nodes[y]);
                    }
                }
            }    
        }
        return result;
    };
    
    /* ---------------------------------------------------------------------------
    --------------------------------------------------------------------------- */
    var filterUniqueNodes = function(nodes) {
        var duplicate = false;
        
        // based on study of blog post at: http://ejohn.org/blog/comparing-document-position/ and jQuery code.
        var sort = (function(){
            if (document.documentElement.compareDocumentPosition) {
                return function(a, b) {
                    var r = a.compareDocumentPosition(b) & 4 ? -1 : a === b ? 0 : 1;
                    if (r == 0) duplicate = true;
                    return r;
                };
            } else if ("sourceIndex" in document.documentElement) {
                return function(a, b) {
                    var r = a.sourceIndex - b.sourceIndex; // return values lower than -1 or higher than 1 does not matter.
                    if (r == 0) duplicate = true;
                    return r;
                };
            }
        })();
        
        nodes.sort(sort);
        
        if (duplicate) {
            var l = nodes.length;
            for (var x = 1; x < l; x++) {
                if (nodes[x] == nodes[x - 1]) {
                    nodes.splice(x--, 1);
                    l--;
                }
            }
        }
        
        return nodes;
    };
    
    /* ---------------------------------------------------------------------------
    im.selectNodes - selectNodes from provided context
        param selector: cssSelector
        param context (optional): element (defaults to document.body)
        param resultArr (optional): array to merge results in.
    --------------------------------------------------------------------------- */
    im.selectNodes = function(selector, context, resultArr) {
        context = context || document;
        if (!context) throw new Error('im.selectNodes - could not get context, are you are the DOM is ready?');
        
        var parsed = parseSelector(selector);
        var results;
        
        var axis = AXISALL;
        
        var pl = parsed.length;
        for (var x = 0; x < pl; x++) {
            
            // can be a single node, but also an array of nodes
            var currentContexts = context.length ? [].concat(context) : [context];
            
            // get one parsed selector
            var psel = parsed[x];
            
            var bl = psel.length;
            for (var y = 0; y < bl; y++) {
                
                if (currentContexts.length == 0) break;
                
                // get one bit
                var bit = psel[y];
                
                if (bit == '') {
                    // ignore
                } else if (bit == '>') {
                    axis = AXISCHILD;
                } else if (/^#/.test(bit)) {
                    // does not check its place in the DOM and simply overrides the current contexts!
                    var el = document.getElementById(bit.substring(1, bit.length));
                    currentContexts = el ? [el] : [];
                    axis = AXISALL;
                } else {
                    if (!bitCache[bit]) bitCache[bit] = parseSelectionBit(bit);
                    currentContexts = getContexts(currentContexts, axis, bitCache[bit]);
                    axis = AXISALL; // set back to axis all
                }
            }
            
            results = (x == 0) ? currentContexts : results.concat(currentContexts);
            results = filterUniqueNodes(results);
        };
        
        if (resultArr) {
            results = filterUniqueNodes(results.concat(resultArr));
            resultArr.splice(0, resultArr.length); // empty the array
            var l = results.length;
            for (var x = 0; x < l; x++) resultArr.push(results[x]);
        }
        
        return results;
    };
    
    /* ---------------------------------------------------------------------------
    chains.find - wraps im.selectNodes.
    --------------------------------------------------------------------------- */
    im.chains.find = function(selector) {
        if (this.length == 0) return this;
        return this.reset(im.selectNodes(selector, this.array()));
    };
    
    /* ---------------------------------------------------------------------------
    chains.parents - gets ancestor nodes based on selector
    does selector '*' when selector is omitted
    
    LIMITATION: parents currently only gets nodes that part of the document structure.
    --------------------------------------------------------------------------- */
    im.chains.parents = function(selector) {
        var results = []; // total result set
        if (!selector || selector == '*') {
            for (var x = 0; x < this.length; x++) im.getAncestors(this[x], results);
            if (this.length > 1) results = filterUniqueNodes(results);
        } else {
            var s = im.selectNodes(selector);
            var l = s.length;
            var iao = im.isAncestorOf;
            for (var x = 0; x < l; x++) {
                var si = s[x];
                for (var y = 0; y < this.length; y++) {
                    if (iao(si, this[y])) {
                        results.push(si);
                        break;
                    }
                }
            }
            results.reverse();
        }
        return this.reset(results);
    };
    
    /* ---------------------------------------------------------------------------
    chains.parent - gets parent nodes. Does not support selectors.
    --------------------------------------------------------------------------- */
    im.chains.parent = function() {
        var results = []; // total result set
        for (var x = 0; x < this.length; x++) {
            var p = this[x].parentNode;
            if (p) results.push(p);
        }
        if (this.length > 1) results = filterUniqueNodes(results);
        return this.reset(results);
    };
    
    /* ---------------------------------------------------------------------------
    chains.filter - filters nodes based on css selector
        param selector: css selector or function
        param invert: inverts logic by filtering out items that _do_ match.
        
        in case a function is passed return true to match:
        im('div').filter(function(index){
            return index == 1 || im(this).attr('id') == 'specialID';
        }).hide();
    --------------------------------------------------------------------------- */
    im.chains.filter = function(selector, invert) {
        var results = [];
        if (im.isFunction(selector)) {
            for (var x = 0; x < this.length; x++) {
                var m = selector.apply(this[x], [x]);
                if ((!invert && m) || (invert && !m)) results.push(this[x]);
            }
        } else {
            var s = im.selectNodes(selector || '*');
            var l = s.length;
            for (var x = 0; x < this.length; x++) {
                for (var y = 0; y < l; y++) {
                    var m = s[y] === this[x];
                    if ((!invert && m) || (invert && !m)) {
                        results.push(this[x]);
                        break;
                    }
                }
            }
        }
        return this.reset(results);
    };
    
})(window.im || window);
