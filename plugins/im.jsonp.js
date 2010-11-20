(function(im){
    
    /* ---------------------------------------------------------------------------
    private variables
    --------------------------------------------------------------------------- */
    var callbackCounter = 0;
    
    /* ---------------------------------------------------------------------------
    public methods
    --------------------------------------------------------------------------- */
    
    /*
    im.jsonp - do a jsonp call with given callback function.
        param url: "http://someservice.com/get.json?callback=$" ($ will be replaced with callback)
        param callback: regular javascript function
    */
    im.jsonp = function(url, callback) {
        // up counter so we can provide a unique callback
        var c = ++callbackCounter;
        
        // create script tag
        var script = document.createElement('script');
        
        // wrap the callback
        im.jsonp[c] = function() {
            im.jsonp[c] = null; // deref to prevent leaks
            callback.apply(window, im.merge([], arguments));
            im.remove(script); // clean up script tag
        };
        
        // do the request
        script.src = url.replace(/=(\$)($|&)/g, '=im.jsonp[' + c + ']$2');
        document.body.appendChild(script);
    };
    
})(window.im || window);