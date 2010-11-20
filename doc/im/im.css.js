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
        param el: element
        param obj: object with style settings (just like im.css)
        param callback (optional): callback to execute when animation is done.
        param speed (optional): speed in milliseconds
        param easing (optional): custom easing function
        param customHandler (optional): handler called each step of the animation.
            function(pos) { // pos = 0 to 1
                // custom animation code
            }
            
        Example: im.animate(el, {width : '200px'}, 200, function(){
            alert('done!');
        });
    
    WARNING: when animating color, please use hex or rgb. Color names 
    ('red', 'blue, etc) are not supported.
    --------------------------------------------------------------------------- */
    im.animate = function(el, obj, speed, callback, easing, customHandler) {
        
        // get current and target style
        var current = {};
        var target = {};
        for (var prop in obj) {
            var currentValue = im.css(el, prop);
            if (currentValue == 'auto') currentValue = '0'; // we can't do anything with auto, really
            current[prop] = parseRule(currentValue);
            target[prop] = parseRule(obj[prop] + '', currentValue);
        }
        
        var start = +new Date;
        var dur = speed ? speed : 300;
        var finish = start + dur;
        easing = easing || function(pos){ return (-Math.cos(pos*Math.PI)/2) + 0.5; };
        
        var interval;
        var step = function(){
            var time = +new Date;
            var pos = time > finish ? 1 : (time - start) / dur;
            
            var v, now = {};
            for (var prop in obj) {
                v = target[prop].method(current[prop].value, target[prop].value, easing(pos)) + target[prop].postfix;
                now[prop] = v;
            }
            im.css(el, now);
            
            if (customHandler) customHandler.apply(el, [easing(pos)]);
            
            if (time >= finish) {
                clearInterval(interval);
                if (callback) callback.apply(el);
            }
        };
        interval = setInterval(step, 10);
        
        // store animation
        var data = im.data(el, 'animations') || [];
        data.push(interval);
        im.data(el, 'animations', data);
    };
        
    /* ---------------------------------------------------------------------------
    chains.animate - wraps im.animate
    --------------------------------------------------------------------------- */
    im.chains.animate = function(obj, speed, callback, easing, customHandler) {
        for (var x = 0; x < this.length; x++) im.animate(this[x], obj, speed, callback, easing, customHandler);
        return this;
    };
    
    /* ---------------------------------------------------------------------------
    im.stop - stops all animations for an element.
    --------------------------------------------------------------------------- */
    im.stop = function(el) {
        var data = im.data(el, 'animations') || [];
        var l = data.length;
        while (l--) {
            clearInterval(data[l]);
        }
    };

    /* ---------------------------------------------------------------------------
    chains.stop - wraps im.stop
    --------------------------------------------------------------------------- */
    im.chains.stop = function() {
        for (var x = 0; x < this.length; x++) im.stop(this[x]);
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
