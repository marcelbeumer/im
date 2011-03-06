/* ---------------------------------------------------------------------------
im.timing.js
--------------------------------------------------------------------------- */
im.register('timing', function (im, window, document) {
    
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
            if (name != 'sync' && name != 'forget' && name != 'forfeit') {
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
    
    --------------------------------------------------------------------------- */
    function createStore(obj, type) {
        // array where we store all calls
        var store = [], name = '__untilstores';
        
        // keep track of all stores, so we can clear them later
        obj[name] = obj[name] || [];
        obj[name].push(store);
        
        return store;
    }
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    function forgetAll(obj) {
        if (obj.__prev) forgetAll(obj.__prev);
        if (!obj.__untilstores) return;
        
        var l = obj.__untilstores.length;
        while (l--) {
            var s = obj.__untilstores[l];
            if (s.interval) window.clearInterval(s.interval);
            s.splice(0, s.length);
        }
        delete obj.__untilstores;
    }

    /* ---------------------------------------------------------------------------
    chains.now - sets chain back in sync mode.
    --------------------------------------------------------------------------- */
    im.chains.now = function() {
        restoreChain(this);
        return this;
    };
    
    /* ---------------------------------------------------------------------------
    chains.until - waits until selector or function returns something
    
    The function or selector will be done within a try-catch statement, so you
    might want to embed your own try catch when debugging.
    --------------------------------------------------------------------------- */
    im.chains.until = function(selectorOrFunctionOrTime, speed) {
        var par = selectorOrFunctionOrTime, 
            fn, check, that = this, result;
        
        // default to a 0ms timeout
        if (par == undefined) par = 0;
        
        // array where we store all calls in async mode
        var store = createStore(this, 'until');

        // stub the chain right away
        stubChain(this, store);
        
        if (im.isFunction(par)) { // interval check fn
            fn = function() {
                return par.apply(that);
            };
        } else if (im.isString(par)) { // interval selector check
            fn = function() {
                // we do a CSS selection using low-level functions, as chaining is disabled.
                return im.selectNodes(par, im.merge([], that)).length > 0;
            };
        } else { // single timeout
            fn = function() {return true;};
            speed = par;
        }
        
        // wrapper
        check = function() {
            try{result = fn();}catch(e){}
            return result;
        };
        
        store.interval = window.setInterval(function(){
            // wait...
            if (!check()) return;
            
            // stop the until
            window.clearInterval(store.interval);
            
            // restore chains
            restoreChain(that);
            
            // run stored chain calls normally
            im.each(store, function(){that = that[this.name].apply(that, this.arg);});
            
            // clear store
            store.splice(0, store.length);

        }, speed === undefined ? 500 : speed);
        
        return this;
    };
    
    /* ---------------------------------------------------------------------------
    chains.forfeit - give up all 'until' operations
    --------------------------------------------------------------------------- */
    im.chains.forget = function() {
        forgetAll(this);
        return this.now();
    };
    
});