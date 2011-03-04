/* ---------------------------------------------------------------------------
im.hash - im hash data manager plugin.
 
TODO:
    - gracefully update the hash without replacing it completely (in case other use the hash as well)
    - check hash length and detect when it's too long
    - hash sanity checks
--------------------------------------------------------------------------- */
im.register('hash', function (im, window, document) {
    
    /* ---------------------------------------------------------------------------
    hash - constructor
    --------------------------------------------------------------------------- */
    var hash = function() {
        
        /* ---------------------------------------------------------------------------
        instance
        --------------------------------------------------------------------------- */
        var self = {};
        
        /* ---------------------------------------------------------------------------
        private properties
        --------------------------------------------------------------------------- */
        var _keys = {};
        var _values = {};
        var _hash;
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        var enc = encodeURIComponent;
        var dec = decodeURIComponent;
        
        /* ---------------------------------------------------------------------------
        getHash - get browser hash
        --------------------------------------------------------------------------- */
        var getHash = function() {
            return (document.location.hash + '').substr(1);
        };
        
        /* ---------------------------------------------------------------------------
        checkHash - checks has changes, and triggers update when changed.
        --------------------------------------------------------------------------- */
        var checkHash = function() {
            var current = getHash();
            if (current != _hash) {
                _hash = current;
                self.update(parseHash(_hash), true);
            }
        };
        
        /* ---------------------------------------------------------------------------
        parseHash - parses hash value and returns data object
        --------------------------------------------------------------------------- */
        var parseHash = function(hash) {
            var m = (hash + '').match(/\*(.*)\*/); /* get stuff betwen '*' and '*' */
            var str = dec((m && m[1]) ? m[1] : '');
            m = str.match(/(\S+?=\S+?)(?:$|&)/g); // components
            
            var com = [];
            if (m) {
                var l = m.length;
                while (l--) {com.push(m[l].replace(/(\S+?)(&|$)/, '$1'));}
            }
            
            var data = {};
            var l = com.length;
            while (l--) {
                var bits = com[l].split('=');
                var name = dec(bits[0]);
                var value = dec(bits[1] || '');
                data[name] = value;
            }
            return data;
        };
        
        /* ---------------------------------------------------------------------------
        self.keyAvailable - returns bool if key is available
        
        param name: name of the key
        --------------------------------------------------------------------------- */
        self.keyAvailable = function(name) {
            return _keys[name] ? false : true;
        };
        
        /* ---------------------------------------------------------------------------
        self.getIncrementalKey - gets incremental key based on name. For instance, 
        providing a name 'widget' will return 'widget1', or 'widget2', or...
        
        param name: key name
        param type: storage type (only 'hash' for now)
        param onchange: onchange handler, in case the hash changes.
        --------------------------------------------------------------------------- */
        self.getIncrementalKey = function(name, type, onchange) {
            var c = 1;
            while (!self.keyAvailable(name + c)) { c++; }
            return self.getUniqueKey(name + c, type, onchange);
        };
        
        /* ---------------------------------------------------------------------------
        self.getUniqueKey - gets unique key based on name.

        param name: key name
        param type: storage type (only 'hash' for now)
        param onchange: onchange handler, in case the hash changes.
        --------------------------------------------------------------------------- */
        self.getUniqueKey = function(name, onchange) {
            if (!self.keyAvailable(name)) return false;
            var k = {name : name, onchange : onchange};
            _keys[name] = k;
            return name;
        };
        
        /* ---------------------------------------------------------------------------
        self.set - sets value on key
        
        param name: key name
        param value: (string) value
        param trigger: (bool) trigger onchange
        --------------------------------------------------------------------------- */
        self.set = function(key, value, trigger) {
            if (_values[key] == value) return;
            _values[key] = value;
            if (trigger && _keys[key] && _keys[key].onchange) {
                _keys[key].onchange(value);
            }
        };
        
        /* ---------------------------------------------------------------------------
        self.get - gets value of key
        
        param name: key name
        --------------------------------------------------------------------------- */
        self.get = function(key) {
            return _values[key];
        };
        
        /* ---------------------------------------------------------------------------
        self.save - saves current values to hash
        --------------------------------------------------------------------------- */
        self.save = function() {
            var hash = '';
            for (var name in _keys) {
                hash += (hash == '' ? '' : '&') + enc(name) + '=' + enc(_values[name]);
            }
            if (hash != '') {
                hash = '*' + enc(hash) + '*';
                document.location.hash = hash;
            }
        };
        
        /* ---------------------------------------------------------------------------
        self.flush - flush values, flush hash.
        --------------------------------------------------------------------------- */
        self.flush = function() {
            _values = [];
            document.location.hash = '';
        };
        
        /* ---------------------------------------------------------------------------
        self.update - update values with object
        
        param values: object with values ({widget1 : 'value', widget2 : 'value'})
        param trigger: (bool) trigger onchange
        --------------------------------------------------------------------------- */
        self.update = function(values, trigger) {
            for (name in values) {self.set(name, values[name] + '', trigger);}
        };
        
        /* ---------------------------------------------------------------------------
        self.init - initializes
        --------------------------------------------------------------------------- */
        self.init = function() {
            
            // init hash
            _hash = getHash();
            self.update(parseHash(_hash));
            
            // keep an eye on the hash
            window.setInterval(function(){checkHash();}, 500);
            
            return self;
        };
        
        return self;
    };
    
    /* ---------------------------------------------------------------------------
    singleton
    --------------------------------------------------------------------------- */
    im.hash = hash();
    
});