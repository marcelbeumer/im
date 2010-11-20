(function(im){
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    var runUserHandlers = function(eventName, element, event) {
        var handlers = im.data(element, 'dnd-user-handlers') || {};
        if (!handlers[eventName]) return;
        
        var returnState;
        im.each(handlers[eventName], function(){
            if (im.isFunction(this)) {
                returnState = this.apply(element, [event]);
            }
        });
        if (returnState === true) im.data(element, 'dnd-state', 'dragging');
        if (returnState === false) im.data(element, 'dnd-state', 'idle');
    };
        
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    var bindUserHandler = function(element, eventName, handler) {
        var handlers = im.data(element, 'dnd-user-handlers') || {};
        var a = handlers[eventName] = handlers[eventName] || [];
        a.push(handler);
        im.data(element, 'dnd-user-handlers', handlers);
    };
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    var bindHandlers = function(element) {
        var handlers = im.data(element, 'dnd-handlers') || {};
        if (handlers.mousedown) return;
        
        var lastX;
        var lastY;
        var elementOffsetX;
        var elementOffsetY;
        
        handlers.mousedown = function(){im.data(element, 'dnd-state', 'mousedown');return false;};
        __super__bind(element, "mousedown", handlers.mousedown);
        
        handlers.mouseup = function(e) {
            var state = im.data(element, 'dnd-state');
            if (state == 'dragging') {
                im.data(element, 'dnd-state', 'idle');
                runUserHandlers('drop', element, e);
            } else {
                im.data(element, 'dnd-state', 'idle');
            }
            return false;
        };
        __super__bind(document.body, "mouseup", handlers.mouseup);
        
        var updateXY = function(e, reset) {
            if (reset) {
                lastX = undefined;
                lastY = undefined;
            }
            e.dragDeltaX = e.x - (lastX === undefined ? e.x : lastX); 
            e.dragDeltaY = e.y - (lastY === undefined ? e.y : lastY);
            lastX = e.x;
            lastY = e.y;
            
            e.dragElementOffsetX = elementOffsetX;
            e.dragElementOffsetY = elementOffsetY;
        };
        
        handlers.mousemove = function(e) {
            var state = im.data(element, 'dnd-state');
            if (state == 'mousedown') {
                
                im.data(element, 'dnd-state', 'dragging');
                runUserHandlers('drag', element, e);
                
                var o = im.offset(element);
                elementOffsetX = o.left - e.x;
                elementOffsetY = o.top - e.y;
                
                updateXY(e, true);
                state = im.data(element, 'dnd-state');
                if (state == 'dragging') runUserHandlers('dragmove', element, e);
                
            } else if (state == 'dragging') {
                updateXY(e);
                runUserHandlers('dragmove', element, e);
            }
            return false;
        };
        
        im.data(element, 'dnd-handlers', handlers);
        __super__bind(document.body, "mousemove", handlers.mousemove);
        
    };
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    var __super__bind = im.bind;
    im.bind = function(element, eventName, handler) {
        if (eventName == "drag" || eventName == "dragmove" || eventName == "drop") {
            bindHandlers(element);
            bindUserHandler(element, eventName, handler);
        } else {
            __super__bind(element, eventName, handler);
        }
    };
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    var __super__unbind = im.unbind;
    im.unbind = function(element, eventName, handler) {
        // TODO: implement unbinding handler (now only all handlers of event name)
        if (eventName == "drag" || eventName == "dragmove" || eventName == "drop") {
            var handlers = im.data(element, 'dnd-user-handlers') || {};
            
            if (!handler) {
                handlers[eventName] = null;
            } else {
                throw new Error("unbind for drag and drop only does not\
                yet implement unbind per handler, only for whole events.");
            }
            
            var hasHandlers = false;
            for (var name in handlers) {
                if (handlers[name]) hasHandlers = true;
            }
            
            if (!hasHandlers) {
                var elementHandlers = im.data(element, 'dnd-handlers', null);
                for (var name in elementHandlers) {
                    var h = elementHandlers[name];
                    __super__unbind(element, name, h);
                }
                im.data(element, 'dnd-user-handlers', null);
                im.data(element, 'dnd-handlers', null);
            }
        } else {
            __super__unbind(element, eventName, handler);
        }
    };
    
})(window.im);