/* -------------------------------------------------------
//////////////////////////////////////////////////////////
im.core.js
//////////////////////////////////////////////////////////
------------------------------------------------------- */
(function(ns){
    // ---------------------------------------------------------------------------
    var VERSION = "1.2RC1";
    
    /* 
    keep reference to ns.im in case there was already something referenced
    and we need to do a noConflict later.
    */
    var prevNS = ns.im;

    /* ---------------------------------------------------------------------------
    im - the public chain constructor
        param selector: a DOM element, array of elements, HTML string or CSS selector.
        param context: a context where to search from in case of a CSS selector.
    --------------------------------------------------------------------------- */
    var im = ns.im = function(selector, context) {
        // im is technically a wrapper around the chains(.init) constructor
        return new Chain(selector, context);
    };
    
    // ---------------------------------------------------------------------------
    im.version = VERSION;
    
    /* ---------------------------------------------------------------------------
    im.noConflict - removes IM from global namespace, and returns IM itself.
    --------------------------------------------------------------------------- */
    im.noConflict = function() {
        ns.im = prevNS;
        return im;
    };
    
    /* ---------------------------------------------------------------------------
    im.browser - parsed user agent. Used jQuery implementation.
    --------------------------------------------------------------------------- */
    im.browser = (function() {
        try {
            var userAgent = navigator.userAgent.toLowerCase();
        } catch(e) {
            var userAgent = '';
        }
        return {
            version : (userAgent.match( /.+(?:rv|it|ra|ie)[\/: ]([\d.]+)/ ) || [])[1],
            safari : /webkit/.test(userAgent),
            opera : /opera/.test(userAgent),
            msie : /msie/.test(userAgent) && !(/opera/.test(userAgent)),
            mozilla : /mozilla/.test(userAgent) && !(/(compatible|webkit)/.test(userAgent))
        };
    })();
    
    /* ---------------------------------------------------------------------------
    im.isFunction - safe isFunction
    --------------------------------------------------------------------------- */
    im.isFunction = function(obj) {
        return Object.prototype.toString.call(obj) === "[object Function]";
    };

    /* ---------------------------------------------------------------------------
    im.isArray - safe isArray
    --------------------------------------------------------------------------- */
    im.isArray = function(obj) {
        return Object.prototype.toString.call(obj) === "[object Array]";
    };

    /* ---------------------------------------------------------------------------
    im.isString - safe isString
    --------------------------------------------------------------------------- */
    im.isString = function(obj) {
        return Object.prototype.toString.call(obj) === "[object String]";
    };

    /* ---------------------------------------------------------------------------
    im.isObject - safe isObject
    --------------------------------------------------------------------------- */
    im.isObject = function(obj) {
        return Object.prototype.toString.call(obj) === "[object Object]";
    };

    /* ---------------------------------------------------------------------------
    im.merge - merges two arrays. 
    Does not care if the passed object are real arrays or not.
        param first: first array, this array will be modified.
        param second: second array
        
    NOTE: this is taken from jquery, as its used to update the internal chain array.
    --------------------------------------------------------------------------- */
    im.merge = function( first, second ) {
        var i = first.length, j = 0;
        if (typeof second.length === "number") {
            for (var l = second.length; j < l; j++) {
                first[i++] = second[j];
            }
        } else {
            while (second[j] !== undefined) {
                first[i++] = second[j++];
            }
        }
        first.length = i;
        return first;
    };
    
    /* ---------------------------------------------------------------------------
    im.extend - extends object
        param firstObj: first object, this object will be updated with the second.
        param secondObj: second object
    --------------------------------------------------------------------------- */
    im.extend = function(firstObj, secondObj) {
        for (var name in secondObj) {
            if (secondObj.hasOwnProperty(name)) firstObj[name] = secondObj[name];
        }
        return firstObj;
    };
    
    /* ---------------------------------------------------------------------------
    im.trim - trims leading and trailing whitespace from string
    --------------------------------------------------------------------------- */
    var rtrim = /^(\s|\u00A0)+|(\s|\u00A0)+$/g;
    im.trim = function(str) {
        return (str || "").replace(rtrim, "" );
    };
    
    /* ---------------------------------------------------------------------------
    im.chains - the container that holds all chaining functions. 
    Extending IM is done by adding a function to this object:
    
    in.chains.mything = function(param) {
        for (var x = 0; x < this.length; x++) doStuff(this[x], param);
        return this; // otherwise chain will break;
    };
    --------------------------------------------------------------------------- */
    im.chains = {};
    
    /* ---------------------------------------------------------------------------
    (private) Chain - instantiates a new Chain. Wrapped by the global im().
        param selector: css selector, html string, onready function, array 
                        or single element.
        param context: context element in case of a css selector.
    --------------------------------------------------------------------------- */
    var Chain = function(selector, context) {
        this.length = 0;
        if (!selector) {
            // no selector, no nodes!
        } else if (im.isString(selector)) {
            // we got passed a css selector or a html string, let's find out.
            if (selector.match('<.*>')) {
                // html string
                if (!im.create) throw new Error("Chain: no create implementation loaded");
                var el = im.create(selector);
                if (!el) return this;
                this.length = 1;
                this[0] = el;
            } else {
                // css selector
                if (!im.selectNodes) throw new Error("Chain: no selectNodes implementation loaded");
                im.merge(this, im.selectNodes(selector, context));
            }
        } else if (im.isFunction(selector)) {
            if (!im.onready) throw new Error("Chain: no onready implementation loaded");
            im.onready(selector);
        } else if (selector.length !== undefined) {
            // we got passed an array
            im.merge(this, selector);
        } else {
            // we got passed a single object
            this.length = 1;
            this[0] = selector;
        }
        return this;
    };
    
    /* ---------------------------------------------------------------------------
    Set the chains as a prototype in order to have access to it when we create
    Chain instances.
    --------------------------------------------------------------------------- */
    Chain.prototype = im.chains;
    

    /* ---------------------------------------------------------------------------
    internal use only. Pushes new chain on the stack so we can do a chains.end or
    chains.reset.
    --------------------------------------------------------------------------- */
    var pushStack = function(obj, selector) {
        var n = im(selector);
        n.__prev = obj;
        return n;
    };
    
    /* ---------------------------------------------------------------------------
    chains.reset - resets chain creating a new one on the stack
        param selector (optional): selector like used in im(selector)
    --------------------------------------------------------------------------- */
    im.chains.reset = function(selector) {
        return pushStack(this, selector);
    };

    /* ---------------------------------------------------------------------------
    chains.end - ends current chain, gets to the previous.
    --------------------------------------------------------------------------- */
    im.chains.end = function() {
        return this.__prev || im();
    };
    
    /* ---------------------------------------------------------------------------
    chains.exec - simply executes a function with 'this' as the chain.
    --------------------------------------------------------------------------- */
    im.chains.exec = function(fn) {
        fn.apply(this);
        return this;
    };

    /* ---------------------------------------------------------------------------
    chains.array - returns real array based on current chain.
    WARNING: breaks chaining.
    --------------------------------------------------------------------------- */
    im.chains.array = function() {
        var a = [];
        im.merge(a, this);
        return a;
    };
    
    /* ---------------------------------------------------------------------------
    chains.item - narrows the scope of the chain to a single item.
    --------------------------------------------------------------------------- */
    im.chains.item = function(number) {
        number = number || 0;
        if (this.length > number && this[number]) return this.reset(this[number]);
        return this.reset();
    };
    
    /* ---------------------------------------------------------------------------
    chains.el - returns a single element within the chain. 
    IMPORTANT: this breaks the chain as it returns a DOM node.
    --------------------------------------------------------------------------- */
    im.chains.el = function(number) {
        number = number || 0;
        if (this.length > number && this[number]) return this[number];
    };
    
    /* ---------------------------------------------------------------------------
    im.each - does callback on each item (array) or property (obj).
        param obj: object or array
        callback: callback to execute on each item/prop (keyword this is the item).
    
    IMPORTANT: 
    performance of the each function is pretty good, but when you are walking 
    large lists that are performance critical, please use regular js for-loop 
    or while instead! 
    
    Code is inspired by the jQuery each.
    --------------------------------------------------------------------------- */
    im.each = function(obj, callback) {
        var length = obj.length;
        var isObject = length === undefined || im.isFunction(obj);
        
        if (isObject) {
            var name;
            for (name in obj) {
                if (callback.call(obj[name], name, obj[name]) === false ) break;
            }
        } else {
            var i = 0;
            for (var value = obj[0]; i < length && callback.call(value, i, value) !== false; value = obj[++i] ) {}
        }
    };
    
    /* ---------------------------------------------------------------------------
    chains.each - wraps im.each
    --------------------------------------------------------------------------- */
    im.chains.each = function(callback) {
        im.each(this, callback);
        return this;
    };
    
})(window);
/* -------------------------------------------------------
//////////////////////////////////////////////////////////
im.dom.js
//////////////////////////////////////////////////////////
------------------------------------------------------- */
(function(im){
    
    /* ---------------------------------------------------------------------------
    im.getAncestors - gets all ancestors of an element
    --------------------------------------------------------------------------- */
    im.getAncestors = function(element, resultArr) {
        var a = resultArr || [];
        var p = element.parentNode;
        while (p) {
            a.push(p);
            p = p.parentNode;
        }
        return a;
    };
    
    /* ---------------------------------------------------------------------------
    im.getAncestorOrSelf - get ancestor of self by node or class name.
        param nodeOrClassName: 'div' or '.tooltip'
        param element: element to search from
    
    NOTE: fast alternative for CSS selection!
    --------------------------------------------------------------------------- */
    im.getAncestorOrSelf = function(nodeOrClassName, element){
        var match = false;
        if (nodeOrClassName.indexOf('.') == 0) {
            if (im.hasClass(element.className, nodeOrClassName.substr(1))) match = true;
        } else {
            if (nodeOrClassName == element.nodeName.toLowerCase()) match = true;
        }
        if (!match) {
            if (element.parentNode){
                return im.getAncestorOrSelf(nodeOrClassName, element.parentNode);
            } else {
                return null;
            }
        } else {
            return element;
        }
    };

    /* ---------------------------------------------------------------------------
    im.isAncestorOf - returns bool if ancestor has the child.
    --------------------------------------------------------------------------- */
    im.isAncestorOf = function(ancestor, child) {
        /*
        previously walked parentNode.parentNode, but refactored after insights
        gained from: http://ejohn.org/blog/comparing-document-position
        */
        return ancestor.contains ? ancestor != child && ancestor.contains(child) : !!(ancestor.compareDocumentPosition(child) & 16);
    };

    /* ---------------------------------------------------------------------------
    im.getFirstChildElement - gets first child element. Skips anything but a real node.
    --------------------------------------------------------------------------- */
    im.getFirstChildElement = function(node) {
        var child = node.firstChild;
        
        // make sure we have a non-textnode
        while (child && child.nodeType != 1) {
            child = child.nextSibling;
        }
        
        return child;
    };
    
    /* ---------------------------------------------------------------------------
    im.getChildElements - get childElements of node. 
    
    NOTE: on IE, this method is much faster than the childNodes property.
    --------------------------------------------------------------------------- */
    im.getChildElements = function(node) {
        var children = [];
        var child = node.firstChild;
        for ( ; child; child = child.nextSibling) {
            if (child.nodeType == 1) children.push(child);
        }
        return children;
    };
    
    /* ---------------------------------------------------------------------------
    im.hasClass - returns bool if element (or class string) has class name.
    
    NOTE: taken from nodewalker.js
    --------------------------------------------------------------------------- */
    im.hasClass = function(strOrElement, className) {
        if (!strOrElement) return false;
        if (!im.isString(strOrElement)) strOrElement = strOrElement.className;
        var r = new RegExp("(^|\\s)" + className + "(\\s|$)");
        return r.test(strOrElement);
    };
    
    /* ---------------------------------------------------------------------------
    chains.hasClass - wraps im.hasClass.
    --------------------------------------------------------------------------- */
    im.chains.hasClass = function(className) {
        if (this.length > 0) return im.hasClass(this[0], className);
    };

    /* ---------------------------------------------------------------------------
    im.addClass - adds class to element. Prevents duplicates.
    --------------------------------------------------------------------------- */
    im.addClass = function(element, className) {
        if (im.hasClass(element.className, className)) return;
        element.className = element.className + ' ' + className;
    };
    
    /* ---------------------------------------------------------------------------
    chains.addClass - wraps im.addClass.
    --------------------------------------------------------------------------- */
    im.chains.addClass = function(className) {
        for (var x = 0; x < this.length; x++) im.addClass(this[x], className);
        return this;
    };
    
    /* ---------------------------------------------------------------------------
    im.removeClass - removes class name from element. 
    Removes duplicates of that class, too.
    --------------------------------------------------------------------------- */
    im.removeClass = function(element, className) {
        var classes = (element.className + '').split(' ');
        var n = [];
        var l = classes.length;
        for (var x = 0; x < l; x++) {
            var c = classes[x];
            if (c != className) n.push(c);
        }
        element.className = n.join(' ');
    };
    
    /* ---------------------------------------------------------------------------
    chians.removeClass - wraps in.removeClass.
    --------------------------------------------------------------------------- */
    im.chains.removeClass = function(className) {
        for (var x = 0; x < this.length; x++) im.removeClass(this[x], className);
        return this;
    };
    
    /* ---------------------------------------------------------------------------
    im.toggle - toggles element class name or visibility.
        param element: element
        param className (optional): className to toggle.
        (if className is not provided, visibility will be toggled)
    --------------------------------------------------------------------------- */
    im.toggle = function(element, className) {
        if (className) {
            if(im.hasClass(element, className)){
                im.removeClass(element, className);
            } else {
                im.addClass(element, className);
            }
        } else {
            var visible = element.style.display != 'none';
            if (visible) {
                im.hide(element);
            } else {
                im.show(element);
            }
        }
    };
    
    /* ---------------------------------------------------------------------------
    chains.toggle - wraps im.toggle
    --------------------------------------------------------------------------- */
    im.chains.toggle = function(className) {
        for (var x = 0; x < this.length; x++) im.toggle(this[x], className);
        return this;
    };

    /* ---------------------------------------------------------------------------
    --------------------------------------------------------------------------- */
    var uuidRef = '_uuidRef' + (+new Date());
    var uuid = 0;
    var elementData = [];
    
    /* ---------------------------------------------------------------------------
    im.getUUID - gets an unique identifier for a node. 
    Creates it if not already available.
    --------------------------------------------------------------------------- */
    im.getUUID = function(element, doNotCreateUUID) {
        if (!element[uuidRef]) element[uuidRef] = ++uuid;
        return element[uuidRef];
    };

    /* ---------------------------------------------------------------------------
    im.hasUUID - returns bool if the element already has an unique identifier.
    --------------------------------------------------------------------------- */
    im.hasUUID = function(element, uuid) {
        if (element[uuidRef] && (!uuid || element[uuidRef] == uuid)) return true;
        return false;
    };
    
    /* ---------------------------------------------------------------------------
    im.getElementByUUID - returns element by unique identifier.
    --------------------------------------------------------------------------- */
    im.getElementByUUID = function(uuid, context, nodeName) {
        var nodes = (context || document).getElementsByTagName(nodeName || '*');
        var len = nodes.length;
        for (var x = 0; x < len; x++) {
            var node = nodes[x];
            if (node[uuidRef] && node[uuidRef] == uuid) return node;
        }
        return null;
    };
    
    /* ---------------------------------------------------------------------------
    im.data - safe way to store data 'on' elements. Gets or sets data on a element.
    returns all IM data when no arguments provided.
        param element (optional): element
        param key (optional): key (string) 
                  returns all element data if not provided
        param value (optional)
    --------------------------------------------------------------------------- */
    im.data = function(element, key, value) {
        if (arguments.length == 0) return elementData;
        if (!element) return;
        var uuid = im.getUUID(element);
        var d = elementData[uuid] = elementData[uuid] || {};
        if (!key) {
            return d;
        } else if (value) {
            d[key] = value;
        } else {
            return d[key];
        }
    };
    
    /* ---------------------------------------------------------------------------
    chains.data - wraps im.data. Sets data on all chain items, gets from first.
    --------------------------------------------------------------------------- */
    im.chains.data = function(key, value) {
        if (value) {
            for (var x = 0; x < this.length; x++) {
                im.data(this[x], key, value);
            }
            return this;
        } else {
            if (this[0]) return im.data(this[0], key, value);
        }
    };
    
    /* ---------------------------------------------------------------------------
    im.show - shows element, uses original display property if known.
    --------------------------------------------------------------------------- */
    im.show = function(element) {
        if (!element) return;
        var olddisplay = im.data(element, 'olddisplay') || 'block';
        element.style.display = olddisplay;
        return element;
    };
    
    /* ---------------------------------------------------------------------------
    chains.show - wraps im.show
    --------------------------------------------------------------------------- */
    im.chains.show = function() {
        for (var x = 0; x < this.length; x++) im.show(this[x]);
        return this;
    };
    
    /* ---------------------------------------------------------------------------
    im.hide - hides element, remembers original display property.
    --------------------------------------------------------------------------- */
    im.hide = function(element) {
        if (!element) return;
        var display = element.style.display;
        if (display != 'none') {
            im.data(element, 'olddisplay', element.style.display);
        }
        element.style.display = 'none';
        return element;
    };
    
    /* ---------------------------------------------------------------------------
    chains.hide - wraps im.hide
    --------------------------------------------------------------------------- */
    im.chains.hide = function() {
        for (var x = 0; x < this.length; x++) im.hide(this[x]);
        return this;
    };
    
    /* ---------------------------------------------------------------------------
    im.remove - removes element (from parent)
    --------------------------------------------------------------------------- */
    im.remove = function(element) {
        element.parentNode.removeChild(element);
    };

    /* ---------------------------------------------------------------------------
    chains.remove - wraps im.remove
    --------------------------------------------------------------------------- */
    im.chains.remove = function() {
        for (var x = 0; x < this.length; x++) im.remove(this[x]);
        return this;
    };
    
    /* ---------------------------------------------------------------------------
    im.appendTo - appends element to element, css selector or html string
    --------------------------------------------------------------------------- */
    im.appendTo = function(element, appendTo) {
        // we do im() in case we have a selector or html string
        im(appendTo).el(0).appendChild(element);
    };
    
    /* ---------------------------------------------------------------------------
    chains.appendTo - appends chained items to element, css elector or html string.
    --------------------------------------------------------------------------- */
    im.chains.appendTo = function(appendTo) {
        /* 
        in case we have a selector or html string, and in case of this chain
        we do it now already to prevent multiple node creation in case of a
        html string.
        */
        a = im(appendTo);
        for (var x = 0; x < this.length; x++) im.appendTo(this[x], a);
        return this;
    };

    /* ---------------------------------------------------------------------------
    im.append - 
    appends element, collection of elements, css selector or html string to element.
    --------------------------------------------------------------------------- */
    im.append = function(element, append) {
        var e = im(append);
        // we do im() in case we have a selector or html string
        for (var x = 0; x < e.length; x++) element.appendChild(e[x]);
    };
    
    /* ---------------------------------------------------------------------------
    chains.append - wraps im.append
    --------------------------------------------------------------------------- */
    im.chains.append = function(append) {
        /* 
        no im() here, we might want to create multiple nodes in case of a 
        html string.
        */
        for (var x = 0; x < this.length; x++) im.append(this[x], append);
        return this;
    };
    
    /* ---------------------------------------------------------------------------
    im.html -
    gets or sets innerHTML
    --------------------------------------------------------------------------- */
    im.html = function(element, value) {
        if (value || value == '') element.innerHTML = value; else return im.trim(element.innerHTML);
    };

    /* ---------------------------------------------------------------------------
    chains.html - wraps im.html
    --------------------------------------------------------------------------- */
    im.chains.html = function(value) {
        if (value || value == '') {
            for (var x = 0; x < this.length; x++) im.html(this[x], value);
            return this;
        } else {
            if (this.length > 0) return im.html(this[0]);
        }
    };
    
    /* ---------------------------------------------------------------------------
    im.create - creates node from html string.
    
    IMPORTANT: be sure to provide a root node. 
    Note that the html string will be trimmed.
    --------------------------------------------------------------------------- */
    im.create = function(html) {
        var div = document.createElement('div');
        div.innerHTML = im.trim(html);
        return div.firstChild;
    };
    
    /* ---------------------------------------------------------------------------
    im.attr - sets or gets an attribute. 
    Returns undefined when getting unset attribute.
        param el: element
        param name: name of attribute.
        (optional) param value: value
        
    Example:
        im.attr(el, 'src', 'foo.png'); // set
        im.attr(el, 'src') // get
    --------------------------------------------------------------------------- */
    im.attr = function(el, name, value) {
        if (value) el.setAttribute(name, value); else return el.getAttribute(name);
    };
    
    /* ---------------------------------------------------------------------------
    im.chains.attr - wraps im.attr.
    For set mode, it sets attributes on all items in chain.
    For get mode, it gets from first item in the chain.
    --------------------------------------------------------------------------- */
    im.chains.attr = function(name, value) {
        if (value) {
            for (var x = 0; x < this.length; x++) im.attr(this[x], name, value);
            return this;
        } else {
            if (this.length > 0) return im.attr(this[0], name);
        }
    };
    
    /* ---------------------------------------------------------------------------
    im.removeAttr - removes attribute
    --------------------------------------------------------------------------- */
    im.removeAttr = function(el, name) {el.removeAttribute(name);};

    /* ---------------------------------------------------------------------------
    im.chains.removeAttr - wraps im.removeAttr.
    --------------------------------------------------------------------------- */
    im.chains.removeAttr = function(name) {
        for (var x = 0; x < this.length; x++) im.removeAttr(this[x], name);
        return this;
    };
    
})(window.im || window);
/* -------------------------------------------------------
//////////////////////////////////////////////////////////
im.events.js
//////////////////////////////////////////////////////////
------------------------------------------------------- */
(function(im){
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    var store = function(element, bucket, obj) {
        // get data storage
        var d = im.data(element, bucket) || [];
        
        // store result
        d.push(obj);  
        im.data(element, bucket, d);
    };
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    var unbind = function(element, bucket, options) {
        // get data
        var d = im.data(element, bucket) || [];
        
        // unbind
        var l = d.length;
        while (l--) {
            var i = d[l];
            if (i && i.unbind) {               
                var matches = true;
                for (var name in options) {
                    if (options[name] && (options[name] != i[name])) {
                        matches = false;
                        break;
                    }
                }
                if (matches) {
                    i.unbind();
                    d.splice(l,1);
                }
            }
        }
        
        // store data
        im.data(element, bucket, d);
    };
        
    /* ---------------------------------------------------------------------------
    im.bind - binds event handler to element.
    Also implements mouseenter and mouseleave events.
        param element: element
        param name: event name without 'on' (ex: 'click', 'mouseover')
        param handler: function 
                       ('this' will be element, first argument will be event obj)
        return false will preventDefault and stopPropagation the event
    Example:
        im.bind(node, 'click', function(e){
            alert(e.target);
            return false; // prevent default and bubble
        });
    --------------------------------------------------------------------------- */
    im.bind = function(element, name, handler) {
        
        // get event implementation
        var types = im.bind.types;
        var impl = (types[name] || types['default'])();
        
        // bind and store
        var unbind = impl.bind(element, name, handler);
        store(element, '__binds__', {name : name, fn : handler, unbind : unbind});
    };
    
    /* ---------------------------------------------------------------------------
    chains.bind - wraps im.bind
    --------------------------------------------------------------------------- */
    im.chains.bind = function(eventName, handler) {
        for (var x = 0; x < this.length; x++) im.bind(this[x], eventName, handler);
        return this;
    };

    /* ---------------------------------------------------------------------------
    im.unbind - unbinds event handler to element. If no handler is provided, it
    removes all event handlers of that event name.
    --------------------------------------------------------------------------- */
    im.unbind = function(element, name, handler) {
        unbind(element, '__binds__', {name : name, fn : handler});
    };

    /* ---------------------------------------------------------------------------
    chains.unbind - wraps im.unbind
    --------------------------------------------------------------------------- */
    im.chains.unbind = function(eventName, handler) {
        for (var x = 0; x < this.length; x++) im.unbind(this[x], eventName, handler);
        return this;
    };
    
    /* ---------------------------------------------------------------------------
    im.live - bind event listener for descendant selector. 
    Does not bind on the actual descendant nodes itself, but relies on event bubbling.
    Therefore, events that don't bubble up, will not be caught.
        param element: element
        param selector: CSS selector (uses CSS selector engine to validate)
        param name: event name (like with im.bind)
        param handler: function 
                       ('this' will be descendant element, 
                       first argument will be event obj)
        
    Example:
        im.live(document.body, 'p .button', 'click', function(e){
            alert('i am a button with this innerHTML: ' + this.innerHTML);
        });
    --------------------------------------------------------------------------- */
    im.live = function(element, selector, name, handler) {
        
        // get event implementationv
        var types = im.bind.types;
        var impl = (types[name] || types['default'])();
        if (!im.isFunction(impl.live)) return;
        
        // bind and store
        var unbind = impl.live(element, selector, name, handler);
        store(element, '__lives__', {
            selector : selector, name : name, fn : handler, unbind : unbind
        });
    };
    
    /* ---------------------------------------------------------------------------
    chains.live - wraps im.live
    --------------------------------------------------------------------------- */
    im.chains.live = function(selector, eventName, handler) {
        for (var x = 0; x < this.length; x++) im.live(this[x], selector, eventName, handler);
        return this;
    };
    
    /* ---------------------------------------------------------------------------
    im.die - unbinds event live handler.
        param element: element
        param selector (optional): css selector
        param name (optional): event name
        param handler (optional): event handler
    --------------------------------------------------------------------------- */
    im.die = function(element, selector, name, handler) {
        unbind(element, '__lives__', {
            selector : selector, name : name, fn : handler
        });
    };
    
    /* ---------------------------------------------------------------------------
    chains.die - wraps im.die
    --------------------------------------------------------------------------- */
    im.chains.die = function(selector, eventName, handler) {
        for (var x = 0; x < this.length; x++) im.die(this[x], selector, eventName, handler);
        return this;
    };
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    im.bind.types = {};
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    im.bind.types['default'] = function() {
        
        var self = {};
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        self.getEventObject = function(e) {
            e = e || window.event;
            if (!e.target) e.target = e.srcElement || document;
            if (e.target.nodeType === 3) event.target = event.target.parentNode;
            if (!e.preventDefault) e.preventDefault = function(){e.returnValue = false;};
            if (!e.stopPropagation) e.stopPropagation = function(){e.cancelBubble = true;};
            return e;
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        self.addEventListener = function(element, name, handler) {
            if (window.addEventListener) {
                element.addEventListener(name, handler, false);
            } else {
                element.attachEvent('on' + name, handler);
            }
        };

        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        self.removeEventListener = function(element, name, handler) {
            if (window.removeEventListener) {
                element.removeEventListener(name, handler, false);
            } else {
                element.detachEvent('on' + name, handler);
            }
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        self.returnValue = function(e, returnValue) {
            if (returnValue !== false) return;
            e.preventDefault();
            e.stopPropagation();
            return false;
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        self.elementWithinSelector = function(element, selector) {
            var el, t = im(element);
            if (t.filter(selector).length > 0) {
                el = element;
            } else {
                var inv = t.parents(selector);
                if (inv.length > 0) el = inv[0];
            }
            return el;
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        self.bind = function(element, name, handler) {
            var that = self;
            
            var h = function(e) {
                e = that.getEventObject(e);
                var r = handler.apply(element, [e]);
                return that.returnValue(e, r);
            };
            
            self.addEventListener(element, name, h);
            
            return function(){
                that.removeEventListener(element, name, h);
            };
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        self.live = function(element, selector, name, handler) {
            var that = self;
            return self.bind(element, name, function(e){
                var el = that.elementWithinSelector(e.target, selector);
                if (el) return handler.apply(el, [e]);
            });
        };
        
        return self;
    };
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    var mouseEnterLeave = function(name) {
        var self = im.bind.types['default']();
        
        var realName = name == 'mouseenter' ? 'mouseover' : 'mouseout';
        
        var validate = function(element, name, e) {
            var related = e.relatedTarget ? e.relatedTarget : (name == "mouseleave" ? e.toElement : e.fromElement);
            if (related && (related == element || im.isAncestorOf(element, related))) return false;
            return true;
        };
        
        var __super__bind = self.bind;
        self.bind = function(element, name, handler) {
            return __super__bind(element, realName, function(e){
                if (!validate(element, name, e)) return;
                return handler.apply(element, [e]);
            });
        };
        
        self.live = function(element, selector, name, handler) {
            var ews = self.elementWithinSelector;
            return __super__bind(element, realName, function(e){
                var el = ews(e.target, selector);
                if (el && validate(el, name, e)) return handler.apply(el, [e]);
            });
        };
        
        return self;
    };
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    im.bind.types.mouseenter = function() {
        return mouseEnterLeave('mouseenter');
    };
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    im.bind.types.mouseleave = function() {
        return mouseEnterLeave('mouseleave');
    };
        
})(window.im || window);

/* ---------------------------------------------------------------------------
DOMDocumentReady and onLoad implementation by marcel@marcelbeumer.com. 
Based on jQuery bindReady code.
--------------------------------------------------------------------------- */
(function(im){
    
    var readyHandlers = [];
    var readyBound = false;
    var isReady = false;
    
    /* ---------------------------------------------------------------------------
    --------------------------------------------------------------------------- */
    var ready = function() {
        if (isReady) return;
        isReady = true;
        var l = readyHandlers.length;
        for (var x = 0; x < l; x++) {
            readyHandlers[x]();
        }
    };
    
    /* ---------------------------------------------------------------------------
    --------------------------------------------------------------------------- */
    var bindReady = function() {
        if (readyBound) return;
        readyBound = true;
        
        if (document.addEventListener && !im.browser.opera) {
            document.addEventListener( "DOMContentLoaded", ready, false );
        }
        
        // If IE is used and is not in a frame
        // Continually check to see if the document is ready
        if (im.browser.msie && window == top ) (function(){
            if (isReady) return;
            try {
                // If IE is used, use the trick by Diego Perini
                // http://javascript.nwbox.com/IEContentLoaded/
                document.documentElement.doScroll("left");
            } catch(e) {
                setTimeout(arguments.callee, 0);
                return;
            }
            // and execute any waiting functions
            ready();
        })();
        
        if (im.browser.opera ) {
            document.addEventListener( "DOMContentLoaded", function () {
                if (isReady) return;
                for (var i = 0; i < document.styleSheets.length; i++) {
                    if (document.styleSheets[i].disabled) {
                        setTimeout( arguments.callee, 0 );
                        return;
                    }
                }
                // and execute any waiting functions
                ready();
            }, false);
        }
        
        im.bind(window, 'load', ready);
    };
    
    /* ---------------------------------------------------------------------------
    im.onready - bind event handler on the DOM Document Ready event, and emulates
    it for browser that do not support it. Always fail-safes to onload event.
    --------------------------------------------------------------------------- */
    im.onready = function(handler) {
        readyHandlers.push(handler);
        bindReady();
    };
    
    /* ---------------------------------------------------------------------------
    im.onload - bind event handler on the onload event of the window.
    --------------------------------------------------------------------------- */
    im.onload = function(handler) {
        im.bind(window, 'load', handler);
    };
    
})(window.im);
/* -------------------------------------------------------
//////////////////////////////////////////////////////////
im.css.js

animation code based on http://github.com/madrobby/emile.
//////////////////////////////////////////////////////////
------------------------------------------------------- */
(function(im){
    
    /* ---------------------------------------------------------------------------
    private properties
    --------------------------------------------------------------------------- */    
    var colorTypes = [
        {re : /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/, convert : function(bits){ // rgb(0,0,0)
            return [parseInt(bits[1], 10),parseInt(bits[2], 10),parseInt(bits[3], 10)];
        }},
        {re : /^#(\w{2})(\w{2})(\w{2})$/, convert : function(bits){ // #fff000
            return [parseInt(bits[1], 16),parseInt(bits[2], 16),parseInt(bits[3], 16)];
        }},
        {re : /^#(\w{1})(\w{1})(\w{1})$/, convert : function(bits) { // #fff
            return [parseInt(bits[1] + bits[1], 16),parseInt(bits[2] + bits[2], 16),parseInt(bits[3] + bits[3], 16)];
        }}
    ];
    var colorCache = {};

    /* ---------------------------------------------------------------------------
    private methods
    --------------------------------------------------------------------------- */
    
    var interpolate = function(source,target,pos) {
        return (source + (target-source) * pos).toFixed(3);
    };
    
    var getColor = function(color) {
        var c,l = colorTypes.length;
        while (l--) {
            var m = colorTypes[l].re.exec(color);
            if (m) {
                c = colorTypes[l].convert(m);
                break;
            }
        }
        return c;
    };
    
    var calculateColor = function(source,target,pos){
        var sc = colorCache[source] = colorCache[source] || getColor(source);
        var tc = colorCache[target] = colorCache[target] || getColor(target);
        var c = 3, r = [];
        while (c--) r[c] = parseInt(sc[c] + ((tc[c] - sc[c]) * pos), 10);
        return 'rgb(' + r.join(',') + ')';
    };
    
    var parseRule = function(value, old) {
        var number = parseFloat(value);
        var postfix = (value + '').replace(/^[\-\d\.]+/,'');
        if (isNaN(number)) { // color
            return {value : value, postfix : '', method : calculateColor};
        } else { // others
            return {value : number, postfix : postfix, method : interpolate};
        }
    };
    
    /* ---------------------------------------------------------------------------
    im.css - gets single CSS property or sets CSS properties on element. 
    Adds cross browser support for opacity.
        param element: element
        param nameOrObject: style name to retreive or object with style settings.
        
        Example: im.css(el, {borderColor : 'red', opacity : 0.5});
        Example: im.css(el, 'width'); // returns string
    --------------------------------------------------------------------------- */
    im.css = function(element, nameOrObject) {
        if (im.isString(nameOrObject)) {
            var c = element.currentStyle ? element.currentStyle : getComputedStyle(element, null);
            if (im.browser.msie && nameOrObject == "opacity") {
                var match = (element.currentStyle.filter + '').match(/alpha\(opacity=(\d+)/);
                return ((match && match.length > 1) ? (parseInt(match[1], 10) / 100) : 1) + '';
            } else {
                return c[nameOrObject];
            }
        } else {
            for (var n in nameOrObject) {
                var s = element.style;
                if (im.browser.msie && n == 'opacity') {
                    if (!element.currentStyle.hasLayout) s.zoom = 1;
                    var v = parseFloat(nameOrObject[n]);
                    if (v == 1) {
                        s.removeAttribute('filter');
                    } else {
                        s.filter = 'alpha(opacity=' + Math.round(v * 100) + ')';
                    }
                } else {
                    s[n] = nameOrObject[n];
                }
            }
        }
    };
    
    /* ---------------------------------------------------------------------------
    chains.css - wraps im.css
    --------------------------------------------------------------------------- */
    im.chains.css = function(nameOrObject) {
        if (im.isString(nameOrObject)) {
            if (this.length > 0) return im.css(this[0], nameOrObject);
        } else {
            for (var x = 0; x < this.length; x++) im.css(this[x], nameOrObject);
            return this;
        }
    };
    
    /* ---------------------------------------------------------------------------
    im.animate - animates element to certain stylestring.
        param el (optional): element
        param obj (optional): object with style settings (just like im.css)
        param callback (optional): callback to execute when animation is done.
        param speed (optional): speed in milliseconds
        param easing (optional): custom easing function
        param customHandler (optional): handler called each step of the animation.
            function(pos) { // pos = 0 to 1
                // custom animation code
            }
            
        Examples: 
        
        // animate css properties and do a callback when done
        im.animate(el, {width : '200px'}, 200, function(){
            alert('done!'); // callback
        });

        // animate css properties, and some custom things
        im.animate(el, {width : '200px'}, 200, null, null, function(p) {
            this.setAttribute('rel', 'i have the width: ' + (p * 200));
        });
        
        // do a completely custom animation, without a fixed set of elements
        var interval = im.animate(null, null, null, null, null, function(p) {
            console.info(p); // completely custom animation.
        });
    
    WARNING: when animating color, please use hex or rgb. Color names 
    ('red', 'blue, etc) are not supported.
    --------------------------------------------------------------------------- */
    im.animate = function(el, obj, speed, callback, easing, customHandler) {
        
        var job = { 
            current : {}, target : {}, obj : obj, el : el, dur : speed ? speed : 300,
            easing : easing || function(pos){ return (-Math.cos(pos*Math.PI)/2) + 0.5; },
            callback : callback, customHandler : customHandler
        };
        
        // get current and target style        
        // obj could be omitted in case of a bare customHandler setup
        if (el && obj) {
            for (var prop in obj) {
                var currentValue = im.css(el, prop);
                if (currentValue == 'auto') currentValue = '0'; // we can't do anything with auto, really
                job.current[prop] = parseRule(currentValue);
                job.target[prop] = parseRule(obj[prop] + '', currentValue);
            }
        }
        
        // add the job to the clock
        im.animate.clock.add(job);
    };
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    im.animate.clock = (function(){
        
        /* ---------------------------------------------------------------------------
        instance
        --------------------------------------------------------------------------- */
        var self = {};
        
        /* ---------------------------------------------------------------------------
        private
        --------------------------------------------------------------------------- */
        var interval;
        
        /* ---------------------------------------------------------------------------
        public
        --------------------------------------------------------------------------- */
        
        self.jobs = [];
        
        /* ---------------------------------------------------------------------------
        render - renders a job at a certain time. Optionally a position can be given,
        which will ignore the time and just pretend to be at position (0 >=< 1)
        --------------------------------------------------------------------------- */
        self.render = function(job, time, position) {
            var j = job;
            var finish = j.finish, start = j.start, dur = j.dur, el = j.el, obj = j.obj, easing = j.easing;
            var current = j.current, target = j.target;
            var pos = position === undefined ? (time >= finish ? 1 : (time - start) / dur) : position;
            
            if (el && obj) {
                var v, now = {};
                for (var prop in obj) {
                    v = target[prop].method(current[prop].value, target[prop].value, easing(pos)) + target[prop].postfix;
                    now[prop] = v;
                }
                im.css(el, now);
            }
                       
            if (j.customHandler) j.customHandler.apply(el || window, [easing(pos)]);
            if (pos === 1 && j.callback) j.callback.apply(el);
            
            return pos === 1;
        };
        
        /* ---------------------------------------------------------------------------
        tick - handling of each click tick
        --------------------------------------------------------------------------- */
        self.tick = function(){
            var time = +new Date, r = self.render, l = self.jobs.length;
            while (l--) {
                if (r(self.jobs[l], time)) self.jobs.splice(l, 1);
            }
            if (self.jobs.length == 0) self.stop();
        };
        
        /* ---------------------------------------------------------------------------
        start - start ticking
        --------------------------------------------------------------------------- */
        self.start = function() {
            interval = setInterval(self.tick, 20);
        };
        
        /* ---------------------------------------------------------------------------
        stop - stop ticking
        --------------------------------------------------------------------------- */
        self.stop = function() {
            if (interval) interval = clearInterval(interval);
        };
        
        /* ---------------------------------------------------------------------------
        remove - remove job at index i in jobs array
        --------------------------------------------------------------------------- */
        self.remove = function(i, end) {
            if (!self.jobs[i]) return;
            var job = self.jobs.splice(i, 1)[0];
            if (end) self.render(job, 0, 1);
        };
        
        /* ---------------------------------------------------------------------------
        add - add job (object) and start it
        --------------------------------------------------------------------------- */
        self.add = function(job) {
            self.jobs.push(job);
            job.start = +new Date;
            job.finish = job.start + job.dur;
            if (!interval) self.start();
        };
    
        return self;
    })();
    
    /* ---------------------------------------------------------------------------
    chains.animate - wraps im.animate
    --------------------------------------------------------------------------- */
    im.chains.animate = function(obj, speed, callback, easing, customHandler) {
        for (var x = 0; x < this.length; x++) im.animate(this[x], obj, speed, callback, easing, customHandler);
        return this;
    };
    
    /* ---------------------------------------------------------------------------
    im.stop - stops all animations for an element.
        param end (optional): set animation to end properties.
    --------------------------------------------------------------------------- */
    im.stop = function(el, end) {
        var jobs = im.animate.clock.jobs;
        var l = jobs.length;
        while (l--) {
            if (jobs[l].el === el) im.animate.clock.remove(l, end);
        }
    };

    /* ---------------------------------------------------------------------------
    chains.stop - wraps im.stop
    --------------------------------------------------------------------------- */
    im.chains.stop = function(end) {
        for (var x = 0; x < this.length; x++) im.stop(this[x], end);
        return this;
    };
    
    /* ---------------------------------------------------------------------------
    im.offset - gets the absolute top and left coordinates for an element.
    --------------------------------------------------------------------------- */
    im.offset = function(el) {
        var l = 0, t = 0;
        while (el) {
            l += el.offsetLeft;
            t += el.offsetTop;
            el = el.offsetParent;
        }
        return {left : l, top : t};
    };
    
    /* ---------------------------------------------------------------------------
    chains.offset - wraps im.offset
    --------------------------------------------------------------------------- */
    im.chains.offset = function() {
        if (this.length > 0) return im.offset(this[0]);
    };
    
    /* ---------------------------------------------------------------------------
    (private) getScrollbarWidth - calculate the width of the OS scrollbar.
    taken from / inspired by jquery.dimensions.js
    --------------------------------------------------------------------------- */
    var getScrollbarWidth = (function(){
        var scrollbarWidth = 0;
        return function() {
            if (!scrollbarWidth) {
                var testEl = im('<div>').css({
                    width: 100, height: 100, overflow: 'auto', 
                    position: 'absolute', top: -1000, left: -1000}).appendTo('body');
                scrollbarWidth = 100 - testEl.append('<div></div>').find('div').css({
                    width: '100%', height: 200}).width();
                testEl.remove();
            }
            return scrollbarWidth;
        };
    })();

    /* ---------------------------------------------------------------------------
    (private) getMargin - calculate margin<dir> of element.
        param el: element
        param dir: 'Left', 'Right, 'Top' or 'Bottom'
    --------------------------------------------------------------------------- */
    var getMargin = function(el, dir) {
        var v = parseInt(im.css(el, 'margin' + dir), 10);
        if (isNaN(v)) v = 0;
        return v;
    };
    
    /* ---------------------------------------------------------------------------
    (private) getSize - calculate size of element. Wrapped by im.width and im.height.
        param el: element
        param axis: 'Width' or 'Height'
        param options (optional): {
            includeScrollbar : true (default is false)
        }
    --------------------------------------------------------------------------- */
    var getSize = function(el, axis, options) {        
        options = options || {};
        
        // in case of the window or document, we need to do all kinds of things.
        if (el === window || el === document) {
            var windowSize, documentSize;
            
            var opp = axis == 'Width' ? 'Height' : 'Width', 
                bodyClientOpp = document.body['client' + opp],
                bodyScrollOpp = document.body['scroll' + opp], 
                windowInnerCur = window['inner' + axis], 
                docElClientCur = document.documentElement['client' + axis], 
                bodyClientCur = document.body['client' + axis],
                bodyScrollCur = document.body['scroll' + axis];
            
            if (!im.browser.msie) {
                windowSize = windowInnerCur;
                var sb = options.includeScrollbar ? 0 : getScrollbarWidth();
                if (bodyClientOpp < bodyScrollOpp) windowSize = windowSize - sb;
            } else {
                // we do not need to take the scrollbarWidth into account for IE
                /* takes body.client<Axis> in quirks, takes documentElement.client<Axis> in standards mode */
                windowSize = docElClientCur || bodyClientCur;
            }
            
            if (windowSize >= bodyScrollCur) documentSize = windowSize; else documentSize = bodyScrollCur;
            
            if (el === window) {
                return windowSize;
            } else if (el === document) {
                return documentSize;
            }
        }
        
        // for elements we just give the offset<Axis>
        var size = el['offset' + axis];
        if (options.includeMargins === true) {
            var gm = getMargin;
            if (axis === 'Width') {
                size += gm(el, 'Left');
                size += gm(el, 'Right');
            } else {
                size += gm(el, 'Top');
                size += gm(el, 'Bottom');
            }
        }
        return size;
    };

    /* ---------------------------------------------------------------------------
    im.width - calculates width of DOM element, window or document.
        param el: element or window or document
            element: the size of the element
            window: the size of the current viewport (excludes scrollbar(s))
            document: the size of the document 
                      (IMPORTANT: is always >= viewport size!)
        param options (optional): {
            includeScrollbar : true (default is false),
            includeMargins : true (default is false)
        }
    --------------------------------------------------------------------------- */
    im.width = function(el, options) {
        return getSize(el, 'Width', options);
    };

    /* ---------------------------------------------------------------------------
    chains.width - wraps im.width. Only for first element in the chain.
    IMPORTANT: breaks chain because it returns an integer value.
    --------------------------------------------------------------------------- */
    im.chains.width = function(options) {
        if (this.length > 0) return im.width(this[0], options);
    };
    
    /* ---------------------------------------------------------------------------
    im.height - calculates height of DOM element, window or document.
        param el: element or window or document
            element: the size of the element
            window: the size of the current viewport (excludes scrollbar(s))
            document: the size of the document 
                      (IMPORTANT: is always >= viewport size!)
        param options (optional): {
            includeScrollbar : true (default is false),
            includeMargins : true (default is false)
        }
    --------------------------------------------------------------------------- */
    im.height = function(el, options) {
        return getSize(el, 'Height', options);
    };
    
    /* ---------------------------------------------------------------------------
    chains.height - wraps im.height. Only for first element in the chain.
    IMPORTANT: breaks chain because it returns an integer value.
    --------------------------------------------------------------------------- */
    im.chains.height = function(options) {
       if (this.length > 0) return im.height(this[0], options);
    };
    
})(window.im || window);
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
    var resultCache = {};

    /* ---------------------------------------------------------------------------
    parseSelector - parse selector by splitting it up by ',' and whitespace.
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
    hasClasses - has classes check based on regex array.
    --------------------------------------------------------------------------- */
    var hasClasses = function(className, regex) {
        var l = regex.length;
        while (l--) {
            if (!regex[l].test(className)) return false;
        }
        return true;
    };
    
    /* ---------------------------------------------------------------------------
    makeHasClassesRegexes - creates regular expressions for classes in array.
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
    parseSelectionBit - parses selection bit, such as 'div.class1.class2'
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
    getContexts - returns new set of contexts based on an axis and selection rules.
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
                            if (_hasClasses(c, regex)) result.push(n);
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
                        if (_hasClasses(c, regex)) result.push(n);
                    } else {
                        result.push(nodes[y]);
                    }
                }
            }    
        }
        return result;
    };
    
    /* ---------------------------------------------------------------------------
    filterUniqueNodes - filters unique nodes in array.
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
    getCacheResultKey - generates result cache key based on context UUID and selector.
    --------------------------------------------------------------------------- */
    var getCacheResultKey = function(context, selector) {
        var k = '', l = context.length;
        while (l--) k += im.getUUID(context[l]) + ':';
        return k + selector;
    };
    
    /* ---------------------------------------------------------------------------
    getResultCache - returns cached result based on context UUID and selector.
    --------------------------------------------------------------------------- */
    var getResultCache = function(context, selector) {
        var key = getCacheResultKey(context, selector);
        return resultCache[key];
    };
    
    /* ---------------------------------------------------------------------------
    addResultCache - adds cached result based on context UUID and selector.
    --------------------------------------------------------------------------- */
    var addResultCache = function(context, selector, result) {
        var key = getCacheResultKey(context, selector);
        resultCache[key] = result;
    };
    
    /* ---------------------------------------------------------------------------
    cleanSelector - fixes whitespace in CSS selector string
    --------------------------------------------------------------------------- */
    var cleanSelector = function(selector) {
        return im.trim(selector.replace(/>/g, ' > ').replace(/\s+/g, ' '));
    };
    
    /* ---------------------------------------------------------------------------
    im.selectNodes - selectNodes from provided context
        param selector: cssSelector (with optional caching command prefix)
        param context (optional): element or array of elements (defaults to document)
        param resultArr (optional): array to merge results in.
        
    About the caching command prefix:
    
    selectNodes supports caching using two keys: the concatenated UUID of all context
    elements, and the selector. Caching can be controlled by adding a prefix to your
    css selectors:
        
        '% .class' - auto mode
        Return cached result, or create new cached result and return that.
        '%! .class' - set mode
        Create/overwrite new cached result, and return the new result.
        '%? .class' - get mode
        Return cached result, returns empty array when not found.
        
    electNodes will never use cached results without a caching prefix. 
    --------------------------------------------------------------------------- */
    im.selectNodes = function(selector, context, resultArr) {
        
        // get contexts and make sure it is an array
        var contexts = context ? (context.length ? context : [context]) : [document];
        
        // handle caching and clean selector string
        var cache = selector.match(/^(%[\?\!]?)(.*)/);
        selector = cleanSelector(cache ? cache[2] : selector);
        if (cache && cache[1] != '%!') {
            var r = getResultCache(contexts, selector);
            if (r || cache[1] == '%?') return r || [];
        }
        
        var parsed = parseSelector(selector);
        var results;
        
        var axis = AXISALL;
        
        var pl = parsed.length;
        for (var x = 0; x < pl; x++) {
            
            // can be a single node, but also an array of nodes
            var currentContexts = [].concat(contexts);
            
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
        
        // add to cache
        if (cache) addResultCache(contexts, selector, results);
        
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
/* -------------------------------------------------------
//////////////////////////////////////////////////////////
scan.js - scanning the DOM with basic CSS selectors.
//////////////////////////////////////////////////////////
------------------------------------------------------- */
(function(ns){
    
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
    ns.scan - scans node or document with very basic CSS selectors, triggering 
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
    ns.scan = function() {
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
    ns.scan.register = function() {
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
    ns.scan.registry = registry;
    
})(window.im || window);
