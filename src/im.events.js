/* -------------------------------------------------------
//////////////////////////////////////////////////////////
im.events.js
//////////////////////////////////////////////////////////
------------------------------------------------------- */
(function(im){
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    var storeBind = function(element, bucket, obj) {
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
        
        // bind
        var unbind = impl.bind(element, name, handler);
        
        // store
        storeBind(element, 'binds', {name : name, fn : handler, unbind : unbind});
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
        unbind(element, 'binds', {name : name, fn : handler});
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
        
        // attach event
        var unbind = impl.live(element, selector, name, handler);
        
        // store
        storeBind(element, 'lives', {
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
    
    --------------------------------------------------------------------------- */
    im.die = function(element, selector, name, handler) {
        unbind(element, 'lives', {
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
    // TODO: make one base class, and have two subclasses inherit with event name option
    // TODO: make live work
    var mouseEnterLeave = function() {
        var self = im.bind.types['default']();
        
        var validate = function(element, name, e) {
            var related = e.relatedTarget ? e.relatedTarget : (name == "mouseleave" ? e.toElement : e.fromElement);
            if (related && (related == element || im.isAncestorOf(element, related))) return false;
            return true;
        };
        
        var __super__bind = self.bind;
        self.bind = function(element, name, handler) {
            var that = self;
            
            var realName = name == 'mouseenter' ? 'mouseover' : 'mouseout';
            var r = __super__bind(element, realName, function(e){
                if (!validate(element, name, e)) return;
                return handler.apply(element, [e]);
            });
            
            return r;
        };
        
        return self;
    };
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    im.bind.types.mouseenter = mouseEnterLeave;
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    im.bind.types.mouseleave = mouseEnterLeave;
        
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
