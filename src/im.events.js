/* -------------------------------------------------------
//////////////////////////////////////////////////////////
im.events.js
//////////////////////////////////////////////////////////
------------------------------------------------------- */
(function(im){
    
    /* ---------------------------------------------------------------------------
    --------------------------------------------------------------------------- */
    var checkPreventDefault = function(e, returnValue) {
        if (returnValue !== false) return;
        if (e && e.preventDefault) {
            e.preventDefault();
        } else {
            if (window.event) window.event.returnValue = false;
        }
        return false;
    };
    
    /* ---------------------------------------------------------------------------
    --------------------------------------------------------------------------- */
    var fixEventObject = function(e) {
        if (!e.target) e.target = e.srcElement || document;
        if (e.target.nodeType === 3) event.target = event.target.parentNode;
    };
    
    /* ---------------------------------------------------------------------------
    --------------------------------------------------------------------------- */
    var validateMouseEnterLeave = function(element, e, eventName) {
        var related = e.relatedTarget ? e.relatedTarget : (eventName == "mouseleave" ? e.toElement : e.fromElement);
        if (related && (related == element || im.isAncestorOf(element, related))) return false;
        return true;
    };
    
    /* ---------------------------------------------------------------------------
    --------------------------------------------------------------------------- */
    var getBindHandler = function(element, eventName, handler) {
        if (eventName == "mouseenter" || eventName == "mouseleave") {
            return function(e) {
                fixEventObject(e);
                if (validateMouseEnterLeave(this === window ? e.target : this, e, eventName)) {
                    return checkPreventDefault(e, handler.apply(element, [e]));
                }
            };
        } else {
            return function(e) {
                fixEventObject(e);
                return checkPreventDefault(e, handler.apply(element, [e]));
            };
        }
    };
    
    /* ---------------------------------------------------------------------------
    --------------------------------------------------------------------------- */
    var translateEventName = function(eventName) {
        if (eventName == "mouseleave") {
            eventName = "mouseout";
        } else if (eventName =="mouseenter") {
            eventName = "mouseover";
        }
        return eventName;
    };
    
    /* ---------------------------------------------------------------------------
    im.bind - binds event handler to element.
    Also implements mouseenter and mouseleave events.
        param element: element
        param eventName: event name without 'on' (ex: 'click', 'mouseover')
        param handler: function 
                       ('this' will be element, first argument will be event obj)
        return false will preventDefault the event
    Example:
        im.bind(node, 'click', function(e){
            alert(e.target);
            return false; // prevent default
        });
    --------------------------------------------------------------------------- */
    im.bind = function(element, eventName, handler) {
        var h = getBindHandler(element, eventName, handler);
        eventName = translateEventName(eventName);
        
        var ed = im.data(element, 'eventHandlers') || {};
        ed[eventName] = ed[eventName] || [];
        ed[eventName].push({h : h, o : handler}); // store both new and original
        im.data(element, 'eventHandlers', ed);
        
        if (window.addEventListener) {
            element.addEventListener(eventName, h, true);
        } else {
            element.attachEvent('on' + eventName, h);
        }
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
    im.unbind = function(element, eventName, handler) {
        eventName = translateEventName(eventName);
        var ed = im.data(element, 'eventHandlers') || {};
        var ea = ed[eventName] || [];
        
        for (var x = 0; x < ea.length; x++) {
            var e = ea[x];
            if (e && e.h && (!handler || e.o === handler)) {
                if (window.removeEventListener) {
                    element.removeEventListener(eventName, e.h, true);
                } else {
                    element.detachEvent('on' + eventName, e.h);
                }
            }
            ea[x] = e.o = e.h = null;
        }
        im.data(element, 'eventHandlers', ed);
    };
    
    /* ---------------------------------------------------------------------------
    prevent memory leaks in IE
    --------------------------------------------------------------------------- */
    if (im.browser.msie) {
        window.attachEvent('onunload', function(){
            var data = im.data();
            for (var x = 0; x < data.length; x++) {
                var elem = im.getElementByUUID(x);
                if (!data[x] || !elem || !data[x].eventHandlers) continue;
                for (var name in data[x].eventHandlers) {
                    try {im.unbind(elem, name);} catch(e) {}
                }
            }
        });
    }
    
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
        param eventName: eventName (like with im.bind)
        param handler: function 
                       ('this' will be descendant element, 
                       first argument will be event obj)
        
    Example:
        im.live(document.body, 'p .button', 'click', function(e){
            alert('i am a button with this innerHTML: ' + this.innerHTML);
        });
    --------------------------------------------------------------------------- */
    im.live = function(element, selector, eventName, handler) {
        
        im.bind(element, translateEventName(eventName), function(e){
            var el;
            
            var t = im(e.target);
            if (t.filter(selector).length > 0) {
                el = e.target;
            } else {
                var inv = t.parents(selector);
                if (inv.length > 0) el = inv[0];
            }
            
            if (el && handler) {
                if (eventName == "mouseenter" || eventName == "mouseleave") {
                    if (validateMouseEnterLeave(el, e, eventName) === true) return handler.apply(el, [e]);
                } else {
                    return handler.apply(el, [e]);
                }
            }
        });
        
    };
    
    /* ---------------------------------------------------------------------------
    chains.live - wraps im.live
    --------------------------------------------------------------------------- */
    im.chains.live = function(selector, eventName, handler) {
        for (var x = 0; x < this.length; x++) im.live(this[x], selector, eventName, handler);
        return this;
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
