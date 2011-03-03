/* -------------------------------------------------------
//////////////////////////////////////////////////////////
scan.js - scanning the DOM with basic CSS selectors.
//////////////////////////////////////////////////////////
------------------------------------------------------- */
im.addConstructor(function (im, window, document) {
    
    /* ---------------------------------------------------------------------------
    --------------------------------------------------------------------------- */
    var STOP_CLASSNAME = 'scan-stop';
    
    /* ---------------------------------------------------------------------------
    --------------------------------------------------------------------------- */
    var bitCache = {};
    var registry = {};

    /* ---------------------------------------------------------------------------
    --------------------------------------------------------------------------- */
    var rtrim = /^(\s|\u00A0)+|(\s|\u00A0)+$/g;
    var trim = function(str) {
        return (str || "").replace(rtrim, "" );
    };
    
    /* ---------------------------------------------------------------------------
    --------------------------------------------------------------------------- */
    var hasClass = function(node, className) {
        var cn = node.className;
        var r = new RegExp("(^|\\s)" + className + "(\\s|$)");
        return r.test(cn);
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
    var runTriggers = function(node, parsed) {
        
        //console.info('running trigger on ' + node.nodeName + '(' + node.className + ')');
        var nn = node.nodeName.toLowerCase();
        var cn = node.className;
        var result = true;
        var sell = parsed.length;
        
        // we use a for here to maintain the order of selectors
        for (var seli = 0; seli < sell; seli++) {
            
            var nnMatch = false;
            var cnMatch = false;
            
            var sel = parsed[seli][0];
            var f = parsed[seli][1];
            
            var joinsl = sel.length;
            while (joinsl-- && (!cnMatch || !nnMatch)) {
                var join = sel[joinsl];
                
                if (join.nodeName == '*' || join.nodeName == nn) nnMatch = true;
                if (join.classNames && join.classNames.length > 0) {
                    if (cn && hasClasses(cn, join.classNames, join.classNamesRegexes)) cnMatch = true;
                } else {
                    cnMatch = true;
                }
            }
            
            if (cnMatch && nnMatch) {
                var r = f.apply(node);
                result = r === false ? r : (r === true ? r : result);
            }
        }
        
        return result;
    };

    /* ---------------------------------------------------------------------------
    --------------------------------------------------------------------------- */
    var walk = function(node, parsed) {
        if (hasClass(node, STOP_CLASSNAME)) return;
        
        var result = runTriggers(node, parsed);
        if (result === false) return;
        
        /* 
        we build up a children array because (at least firefox) might not 
        walk the dom correctly when we do the walker _while_ going
        through the siblings and _while_ modules are modifying the dom
        */
        var len = 0;
        var children = [];
        var child = node.firstChild;
        for ( ; child; child = child.nextSibling) {
            if (child.nodeType == 1) {
                children.push(child);
                len++; // while we walk anyway, lets keep track of the size
            }
        }
        
        for (var x= 0; x < len; x++) {
            walk(children[x], parsed);
        }
    };

    /* ---------------------------------------------------------------------------
    --------------------------------------------------------------------------- */
    var parseSelectionBit = function(bit) {
        var parts = bit.split('.');
        var nodeName = parts.shift();
        var classNames = parts;
        
        return {  
            nodeName : nodeName == '' ? '*' : nodeName,
            classNames : classNames,
            classNamesRegexes : makeHasClassesRegexes(classNames)
        };
    };

    /* ---------------------------------------------------------------------------
    --------------------------------------------------------------------------- */
    var parseSelector = function(selector) {
        var joins = selector.split(',');
        var jl = joins.length;
        
        while (jl--) {
            var bit = trim(joins[jl]);
            joins[jl] = bitCache[bit] = bitCache[bit] || parseSelectionBit(bit);
        }
        return joins;
    };

    /* ---------------------------------------------------------------------------
    --------------------------------------------------------------------------- */
    var parseTriggers = function(triggers) {
        var parsed = [];
        
        var l = triggers.length;
        for (var x = 0; x < l; x++) {
            var t = triggers[x];
            var p = parseSelector(t[0]);
            var f = t[1];
            parsed.push([p, f]);        
        }
        
        return parsed;
    };
    
    /* ---------------------------------------------------------------------------
    im.scan - scans node or document with very basic CSS selectors, triggering 
    registered callbacks on a match.
    
    Examples of usage:
        scan() // scans entire document.body without trigger (not useful :))
        scan(node) // scans from node
        scan('foo') // scans entire document.body with trigger type 'foo'
        scan('foo', 'bar') // same but for both trigger type 'foo' and 'bar'
        scan('foo', node) // scan node for trigger type 'foo'
        scan(['.button', function(){alert(this + ' is a button');}]);
    
    Or any combination of those, as it checks all passed arguments by type.
    --------------------------------------------------------------------------- */
    im.scan = function() {
        var l = arguments.length, t = [], nodes = [], str = Object.prototype.toString;
        while (l--) {
            var a = arguments[l];
            if (str.call(a) == '[object String]') {
                t = t.concat(registry[a] || []);
            } else if (str.call(a) == '[object Array]') {
                t = t.concat(a);
            } else if (a.nodeType) {
                nodes.push(a);
            }
        }
        
        if (t.length == 0) return; // don't walk when there are no triggers
        t = parseTriggers(t);
        if (nodes.length == 0) nodes.push(document.body);
        
        var nl = nodes.length;
        while (nl--) {
            walk(nodes[nl], t);
        }
    };
    
    /* ---------------------------------------------------------------------------
    scan.register - registers scan trigger.
        param type: (string) 'type'
        (any number of repetition of types)
        param selector (second last position): cssSelector
        param fn (last position): function
    
    Examples:
        register('foo', 'a.button', function(){alert(this + ' is a button');});
        register('foo', 'bar', 'a.button', function(){alert(this + ' is a button');});
    --------------------------------------------------------------------------- */
    im.scan.register = function() {
        var type, selector, fn, l = arguments.length;
        if (l < 3) throw new Error('scan.register takes at least three parameters');
        
        selector = arguments[l-2];
        fn = arguments[l-1];
        
        for (var x = 0; x < l - 2; x++) {
            var a = arguments[x];
            var r = registry[a] = registry[a] || [];
            r.push([selector, fn]);
        }
    };
    
    /* ---------------------------------------------------------------------------
    --------------------------------------------------------------------------- */
    im.scan.registry = registry;
    
});