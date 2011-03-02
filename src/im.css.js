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
            
            var c = element.currentStyle !== undefined ? element.currentStyle : getComputedStyle(element, null);
            if (!c) return; // return undefined when we can't find any style (most likely node outside the DOM)
            
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
                    
                    /* 
                    We set zoom when no hasLayout, or when the node doesn't have style yet,
                    which could happen when we are setting properties on a node outside the
                    DOM.
                    */
                    if (!element.currentStyle || !element.currentStyle.hasLayout) s.zoom = 1;
                    
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
    im.animate - animates element to set of properties.
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
    im.animate.clock - animation clock.
    IM runs all it animations on a single 'clock', that automatically starts and
    stops its interval when there are animations to process or not.
    IM uses a single clock to prevent unwanted UI rendering when running multiple 
    animations at once.
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
                bodyClientOpp = im.__doc.body['client' + opp],
                bodyScrollOpp = im.__doc.body['scroll' + opp], 
                windowInnerCur = im.__win['inner' + axis], 
                docElClientCur = im.__doc.documentElement['client' + axis], 
                bodyClientCur = im.__doc.body['client' + axis],
                bodyScrollCur = im.__doc.body['scroll' + axis];
            
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
