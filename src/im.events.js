/* -------------------------------------------------------
//////////////////////////////////////////////////////////
im.events.js
//////////////////////////////////////////////////////////
------------------------------------------------------- */
im.add_constructor(function (im, window, document) {
    
    /* ---------------------------------------------------------------------------
    store - stores event data in certain key/bucket
    --------------------------------------------------------------------------- */
    var store = function(element, bucket, obj) {
        // get data storage
        var d = im.data(element, bucket) || [];
        
        // store result
        d.push(obj);  
        im.data(element, bucket, d);
    };
    
    /* ---------------------------------------------------------------------------
    unbind - generic unbind mechanism based on event bucket data
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
        if (!im.is_function(impl.live)) return;
        
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
    im.bind.types - object that stores all event implementations. 
    IM will take 'default' when it can not find im.bind.types[eventName].
    --------------------------------------------------------------------------- */
    im.bind.types = {};
    
    /* ---------------------------------------------------------------------------
    im.bind.types['default'] - default event implementation, covers all standard
    browser events and serves as a base class for other custom event implementations.
    --------------------------------------------------------------------------- */
    im.bind.types['default'] = function() {
        
        var self = {};
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        self.getEventObject = function(e, element) {
            e = e || window.event;
            if (!e.target) e.target = e.srcElement || document;
            if (!e.currentTarget) e.currentTarget = element;
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
                e = that.getEventObject(e, element);
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
    mouseEnterLeave - mouseenter / mouseleave implementation.
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
        // IE has a native mouseenter
        return im.browser.msie ? im.bind.types['default']() : mouseEnterLeave('mouseenter');
    };
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    im.bind.types.mouseleave = function() {
        // IE has a native mouseleave
        return im.browser.msie ? im.bind.types['default']() : mouseEnterLeave('mouseleave');
    };
    
    /* ---------------------------------------------------------------------------
    uniqueEventTypeFactory - simple boiler plate for unique one time events such
    as onready and onload (or any custom one).
    --------------------------------------------------------------------------- */
    var uniqueEventTypeFactory = function(impl) {
        
        /* ---------------------------------------------------------------------------
        type - the event type function
        --------------------------------------------------------------------------- */
        var type = function() {
            
            /* ---------------------------------------------------------------------------
            instance
            --------------------------------------------------------------------------- */
            var self = {};
            
            /* ---------------------------------------------------------------------------
            private bindRealEventCallback
            --------------------------------------------------------------------------- */
            var bindRealEventCallback = function() {
                type.run();
                impl.unbindRealEvent(bindRealEventCallback);
            };
            
            /* ---------------------------------------------------------------------------
            private bindRealEvent - binds real browser event. Will ask implementation object
            to actually bind.
            --------------------------------------------------------------------------- */
            var bindRealEvent = function() {
                if (type.bound) return;
                impl.bindRealEvent(bindRealEventCallback);
            };
            
            /* ---------------------------------------------------------------------------
            public self.bind - binds event hanlder and pushes handler into handlers
            array.
            --------------------------------------------------------------------------- */
            self.bind = function(element, name, handler) {
                if (type.done || !impl.validateElement(element)) return;
                bindRealEvent();
                if (im.is_function(handler)) type.handlers.push(handler);
            };
            
            /* ---------------------------------------------------------------------------
            return instance
            --------------------------------------------------------------------------- */
            return self;
        };
        
        /* ---------------------------------------------------------------------------
        static type.run - runs all handlers on the event type, and sets the event as 'done'.
        Will only run once.
        --------------------------------------------------------------------------- */
        type.run = function() {
            if (type.done) return;
            type.done = true;
            if (impl.beforeRun) impl.beforeRun();
            var l = type.handlers.length;
            for (var x = 0; x < l; x++) {type.handlers[x]();}
            type.handlers = null; // deref.
        };
        
        /* ---------------------------------------------------------------------------
        static properties
        --------------------------------------------------------------------------- */
        type.handlers = []; // array with handlers
        type.done = false; // event done or not
        type.bound = false; // real event is bound
        
        /* ---------------------------------------------------------------------------
        return function
        --------------------------------------------------------------------------- */
        return type;
    };
    
    /* ---------------------------------------------------------------------------
    im.bind.types.ready - cross browser implementation of DOMContentLoaded event
    --------------------------------------------------------------------------- */
    im.bind.types.ready = (function(){
        
        /* ---------------------------------------------------------------------------
        specific implementation of unique event type
        --------------------------------------------------------------------------- */
        var impl = {};
        
        /* ---------------------------------------------------------------------------
        private properties
        --------------------------------------------------------------------------- */
        var _callback;
        
        /* ---------------------------------------------------------------------------
        explorer scroll onready check.
        based on http://javascript.nwbox.com/IEContentLoaded/ and jQuery
        --------------------------------------------------------------------------- */
        var explorerScrollCheck = function(callback) {
            // check if we are the top level window
            var toplevel = false;
            try {toplevel = window.frameElement == null;} catch(e) {}
            
            // when can only do this trick when we are toplevel.
            if (toplevel) (function(){
                try {
                    document.documentElement.doScroll("left");
                } catch(e) {
                    setTimeout(arguments.callee, 0);
                    return;
                }
                callback();
            })();
        };
        
        /* ---------------------------------------------------------------------------
        impl.validateElement - will only bind this event to the document
        --------------------------------------------------------------------------- */
        impl.validateElement = function(element) {return element === document;};
        
        /* ---------------------------------------------------------------------------
        impl.bindRealEvent - bind the actual browser events, and do some tricks
        for some browsers. Also, bind to onload to be sure.
        --------------------------------------------------------------------------- */
        impl.bindRealEvent = function(callback) {
            if (document.addEventListener) {
                // the proper way
                _callback = callback;
                document.addEventListener("DOMContentLoaded", _callback, false);
                
            } else if (window.attachEvent) {
                // might be late
                _callback = function(){if (document.readyState === "complete") callback();};
                document.attachEvent("onreadystatechange", _callback);
                // should work
                if (im.browser.msie) explorerScrollCheck(callback);
            }
            
            // always safe
            im.bind(window, 'load', callback);
        };
        
        /* ---------------------------------------------------------------------------
        impl.unbindRealEvent - unbind browser events
        --------------------------------------------------------------------------- */
        impl.unbindRealEvent = function(callback) {
            if (document.removeEventListener) {
                document.removeEventListener("DOMContentLoaded", _callback, false);
            } else if (window.detachEvent) {
                document.detachEvent("onreadystatechange", _callback);
            }
        };
        
        /* ---------------------------------------------------------------------------
        return unique event type based on this implementation
        --------------------------------------------------------------------------- */
        return uniqueEventTypeFactory(impl);
    })();
    
    /* ---------------------------------------------------------------------------
    im.bind.types.load - window.onload wrapper so we can make sure the onready
    event happens before onload.
    --------------------------------------------------------------------------- */
    im.bind.types.load = (function() {
        
        /* ---------------------------------------------------------------------------
        specific implementation of unique event type
        --------------------------------------------------------------------------- */
        var impl = {};
        
        /* ---------------------------------------------------------------------------
        impl.validateElement - will only bind this event to the window object
        --------------------------------------------------------------------------- */
        impl.validateElement = function(element) {
            return element === window;
        };
        
        /* ---------------------------------------------------------------------------
        impl.bindRealEvent - bind the actual browser event.
        --------------------------------------------------------------------------- */
        impl.bindRealEvent = function(callback) {
            if (window.addEventListener) {
                window.addEventListener("load", callback, false);
            } else if (window.attachEvent) {
                window.attachEvent("onload", callback);
            }
        };
        
        /* ---------------------------------------------------------------------------
        impl.unbindRealEvent - unbind browser events
        --------------------------------------------------------------------------- */
        impl.unbindRealEvent = function(callback) {
            if (document.removeEventListener) {
                document.removeEventListener("load", callback, false);
            } else if (window.detachEvent) {
                document.detachEvent("onload", callback);
            }
        };
        
        /* ---------------------------------------------------------------------------
        impl.beforeRun - hook that will run ready event handlers.
        --------------------------------------------------------------------------- */
        impl.beforeRun = function() {
            im.bind.types.ready.run();
        };
        
        /* ---------------------------------------------------------------------------
        return unique event type based on this implementation
        --------------------------------------------------------------------------- */
        return uniqueEventTypeFactory(impl);
    })();
    
    /* ---------------------------------------------------------------------------
    im.onready - binds onready event handler to document
    --------------------------------------------------------------------------- */
    im.onready = function(handler) {
        im.bind(document, 'ready', handler);
    };
    
    /* ---------------------------------------------------------------------------
    im.onload - bind event handler on the onload event of the window.
    --------------------------------------------------------------------------- */
    im.onload = function(handler) {
        im.bind(window, 'load', handler);
    };
    
});