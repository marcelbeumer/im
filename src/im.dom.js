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
            if (im.hasClass(element.className, nodeOrClassName)) match = true;
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
    var uuidRef = '_uuidRef' + (new Date());
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
    
})(window.im || window);
