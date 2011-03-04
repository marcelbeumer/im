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
im.register('async', function (im, window, document) {
    
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
            if (name != 'sync' && name != 'forget') obj[name] = createMemorizer(name, s);
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
        
        // keep track of all stores, so we can clear them later
        this.__asyncstores = this.__asyncstores || [];
        this.__asyncstores.push(store);

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
    chains.forget - forgets all async store and goes back to sync mode
    --------------------------------------------------------------------------- */
    im.chains.forget = function() {
        if (!this.__asyncstores) return this;
        
        var l = this.__asyncstores.length;
        while (l--) {
            var s = this.__asyncstores[l];
            s.splice(0, s.length);
        }
        delete this.__asyncstores;
        
        return this.sync();
    };
    
    /* ---------------------------------------------------------------------------
    chains.sync - sets chain back in sync mode.
    --------------------------------------------------------------------------- */
    im.chains.sync = function() {
        restoreChain(this);
        return this;
    };
    
    /* ---------------------------------------------------------------------------
    chains.exec - simply executes a function with 'this' as the chain.
    NOTE: in core for IM > 1.1.1, added it here for compatibility with IM 1.1.1.
    --------------------------------------------------------------------------- */
    if (!im.chains.exec) {
        im.chains.exec = function(fn) {
            fn.apply(this);
            return this;
        };
    }
        
});