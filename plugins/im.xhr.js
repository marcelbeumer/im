im.register('xhr', function (im, window, document) {
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    var createXMLHttpRequest = function() {
        var xhr;
        var local = window.location.protocol !== "file:";
        if (window.XMLHttpRequest && (!local || !im.browser.msie)) {
            xhr = new XMLHttpRequest();
        } else {
            try {
                xhr = new window.ActiveXObject("Microsoft.XMLHTTP");
                
                // prevent leaks
                window.attachEvent('onunload', function(){
                    if (xhr.readyState != 4) {
                        xhr.onreadystatechange = new window.Function;
                    }
                });
                
            } catch(e) {}
        }
        return xhr;
    };
    
    /* ---------------------------------------------------------------------------
    im.xhr - returns new XMLHttpRequest object.
    --------------------------------------------------------------------------- */
    im.xhr = function() {
        return createXMLHttpRequest();
    };
    
    /* ---------------------------------------------------------------------------
    im.xhr.get - does GET request to URL. 
    Will do async request when callback is provided, and a sync request without.
        param url : url
        param callback (optional, causes sync/async): function
    --------------------------------------------------------------------------- */
    im.xhr.get = function(url, callback) {
        var xhr = im.xhr();
        xhr.open('get', url, (callback ? true : false));
        
        if (callback) {
            xhr.onreadystatechange = function(){
                if (this.readyState == 4) {
                    xhr.onreadystatechange = new window.Function; // prevent leak (MSIE)
                    callback.apply(xhr);
                }
            };
        }
        
        xhr.send(null);
        return xhr;
    };
    
});