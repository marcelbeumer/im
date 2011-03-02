(function(im){
    
    /* ---------------------------------------------------------------------------
    TODO:
    check if script is loaded, but callback is not trigger (so error)
    
    USAGE:
        // ex 1:
        im.jsonp('http://someurl.json', function(data){
            // do your thing
        });
        
        // ex 2, max two seconds per request, with error handling:
        
        var handler = im.jsonp('http://someurl.json', function(data){
            // all goes well
        }, function() {
            // it failed
        }, 2000);
        
        // we can also abort
        handler.abort(); // does not trigger error handler
    --------------------------------------------------------------------------- */
    
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
    im.jsonp = function(url, callback, errorCallback, maxTime) {
        // up counter so we can provide a unique callback
        var c = ++callbackCounter;
        
        // bookkeeping
        var aborted = false;
        var done = false;
        
        // create script tag
        var script = document.createElement('script');
        
        // wrap the callback
        im.jsonp['__' + c] = function() {
            done = true;
            im.jsonp[c] = null; // deref to prevent leaks
            if (!aborted) callback.apply(window, im.merge([], arguments));
            if (script && script.parentNode) im.remove(script); // clean up script tag
        };
        
        // do the request
        script.src = url.replace(/=(\$)($|&)/g, '=im.jsonp.__' + c + '$2');
        document.body.appendChild(script);
        
        // request handler
        var handler = {
            abort : function() {
                if (done) return;
                aborted = true; 
                if (script && script.parentNode) im.remove(script);
            }
        };
        
        // abort request on max time
        if (maxTime) {
            window.setTimeout(function(){
                if (done || aborted) return;
                handler.abort();
                if (errorCallback) errorCallback();
            }, maxTime);
        }
        
        // return handler
        return handler;
    };
    
})(window.im || window);