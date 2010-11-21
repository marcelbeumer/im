/* ---------------------------------------------------------------------------
im.async.js

Asynchronous chaining:

im('.element').async(1000)
    .show()
    .animate({opacity : '1'})
.sync()
    .css({color : 'red'})
    .css({opacity : '0'})

// and so on ...

--------------------------------------------------------------------------- */
(function(){
    
    /* ---------------------------------------------------------------------------
    (private) createMemorizer - returns function that remembers chain calls.
    --------------------------------------------------------------------------- */
    var createMemorizer = function(name, store) {
        var s = store;
        return function() {
            s.push({name : name, arg: arguments});
            return this;
        };
    };
    
    /* ---------------------------------------------------------------------------
    (private) stubChain - stubs chain with memorizer functions
    --------------------------------------------------------------------------- */
    var stubChain = function(obj, store) {
        var s = store;
        for (var name in im.chains) {
            if (name != 'sync' && !obj.hasOwnProperty(name)) {
                obj[name] = createMemorizer(name, s);
            }
        }
    };
    
    /* ---------------------------------------------------------------------------
    (private) restoreChain - restores chain by removing 'stub' chain methods.
    --------------------------------------------------------------------------- */
    var restoreChain = function(obj) {
        for (var name in im.chains) {
            if (obj.hasOwnProperty(name)) delete obj[name];
        }
    };
    
    /* ---------------------------------------------------------------------------
    chains.async - sets chain in async mode. Will say async until .sync call.
        param time: timeout in milliseconds (default is 0)
        
    NOTE: the default timeout of 0 will execute after execution of the 'current
    function', just like how a setTimout(fn, 0) would work.
    --------------------------------------------------------------------------- */
    im.chains.async = function(time) {
        var t = time || 0;
        
        // array where we store all calls in async mode
        var store = [];

        // stub the chain right away
        stubChain(this, store);
                
        var that = this;
        window.setTimeout(function(){
            // restore chains
            restoreChain(that);
            // run stored chain calls normally
            im.each(store, function(){that = that[this.name].apply(that, this.arg);});
        }, t);
        
        return this;
    };
    
    /* ---------------------------------------------------------------------------
    chains.sync - sets chain back in sync mode.
    --------------------------------------------------------------------------- */
    im.chains.sync = function() {
        restoreChain(this);
        return this;
    };
        
})();