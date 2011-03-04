/* -------------------------------------------------------
//////////////////////////////////////////////////////////
im.core.js
//////////////////////////////////////////////////////////
------------------------------------------------------- */
(function(window, document, environment){
    
    // TODO: fix no_conflict!
    
    /* ---------------------------------------------------------------------------
    private variables
    --------------------------------------------------------------------------- */
    var version = "{{IM_VERSION}}",
        prev_im = environment ? environment.prev_im : window.im, // last exposed im, so we can do no_conflict later
        callee = arguments.callee, // we need callee to be able to do .env
        constructors = environment ? environment.constructors : {}, // constructors
        im;

    /* ---------------------------------------------------------------------------
    im - the public chain constructor
        param selector: a DOM element, array of elements, HTML string or CSS selector.
        param context: a context where to search from in case of a CSS selector.
    --------------------------------------------------------------------------- */
    im = function(selector, context) {
        // im is technically a wrapper around the chains(.init) constructor
        return new Chain(selector, context);
    };
    
    /* ---------------------------------------------------------------------------
    expose version
    --------------------------------------------------------------------------- */
    im.version = version;
    
    /* ---------------------------------------------------------------------------
    bind im to either an environment object, or to the window object.
    --------------------------------------------------------------------------- */
    if (environment) {
        environment.im = im;
    } else {
        window.im = im;
    }
    
    /* ---------------------------------------------------------------------------
    im.register - registers an im environment constructor.
        param name: name on the constructor
        param fn: constructor function
        
    The constructor function will be called by im.env with the params:
        im - the im object
        window - the window object
        document - the document object
    --------------------------------------------------------------------------- */
    im.register = function(name, fn) {
        constructors[name] = fn;
        // apply directly when in environment (which goes for plugins)
        if (environment) fn(im, window, document);
    };
    
    /* ---------------------------------------------------------------------------
    im.env - create new environment.
        param win:  (Optional) window object the environment should operate on.
                    Defaults to window. Will try to resolve window object when
                    passed an iframe object.
        param keep_prev_im: used internally to not overwrite the no_conflict
    --------------------------------------------------------------------------- */
    im.env = function(win, keep_prev_im) {
        
        // get the window object
        win = win ? (win.contentWindow || win) : window;
        
        var e = { // environent object
                constructors : constructors, 
                prev_im : keep_prev_im ? im.noConflict(true) : null
            },
            doc = win.document;
            name;
        
        callee(win, doc, e); // create new im on environment
        
        // apply all constructors
        for (name in constructors) {
            constructors[name](e.im, win, doc);
        }
        
        // return the newly created im
        return e.im;
    };
    
    /* ---------------------------------------------------------------------------
    im.noConflict - removes IM from global namespace, and returns IM itself.
        param no_restore:   (used internally) when true, it returns the previous 
                            window.im, instead of restoring the window.im and 
                            returning the new im.
    --------------------------------------------------------------------------- */
    im.noConflict = function(no_restore) {
        if (no_restore === true) return prev_im;
        if (prev_im === null) return false;
        window.im = prev_im;
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
    im.proxy - returns scoped function.
        param fn: function to scope
        param scope: scope to run in
    --------------------------------------------------------------------------- */
    im.proxy = function(fn, scope) {
        return function() {return fn.apply(scope, arguments);};
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
        } else if (selector.nodeType) {
            // we got passed a dom element
            this.length = 1;
            this[0] = selector;
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
            // we got passed an onready handler
            if (!im.onready) throw new Error("Chain: no onready implementation loaded");
            im.onready(selector);
        } else if (selector.length !== undefined) {
            // we got passed an array
            im.merge(this, selector);
        } else {
            // we got some object
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
    var push_stack = function(obj, selector) {
        var n = im(selector);
        n.__prev = obj;
        return n;
    };
    
    /* ---------------------------------------------------------------------------
    chains.reset - resets chain creating a new one on the stack
        param selector (optional): selector like used in im(selector)
    --------------------------------------------------------------------------- */
    im.chains.reset = function(selector) {
        return push_stack(this, selector);
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
    
})(window, document, false);
