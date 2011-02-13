/* ---------------------------------------------------------------------------
im.template

Supports:
    * Getting values with {%=value%}
    * Executing code with {%:alert('x')%}
    * Includes
    * Extending ala Django templates
    * Custom tags
    * Overriding anything... :)

Todo:
    * more debugging facilities
--------------------------------------------------------------------------- */
(function(ns){
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    ns.template = function(template, options) {
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        var self = {};
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        var _template = template;
        var _options = options || {};
        var _fn;
        var _code;
        var _matcher;
        var _processor;
        var _templates;
        var _tags;
        var _initialized;
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        var init = function(templates, tags) {
            if (_initialized) return;
            
            // reset all variables
            self.reset();
            
            // merge objects
            im.extend(_templates, ns.template.templates);
            im.extend(_templates, templates || {});
            im.extend(_tags, ns.template.tags);
            im.extend(_tags, tags || {});
            
            // initialize matcher and processor
            for (var name in _tags) {
                _tags[name](_matcher, _processor);
            }
            
            _initialized = true;
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        self.getParsed = function() {
            return _code;
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        self.loadParsed = function(code) {
            _code = code;
            _fn = new Function("obj", "blocks", _code);
            return self;
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        self.reset = function() {
            self.clean();
            _initialized = false;
            _code = undefined;
            _fn = undefined;
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        self.clean = function() {
            _templates = {};
            _tags = {};
            _matcher = {};
            _processor = {};
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        self.parse = function(templates, tags) {
            if (_options.reparse === true) self.reset();
            if (_fn) return self;
            init(templates, tags);
            
            // template
            var t = _template + '';
            
            // remove tabs, newlines
            t = t.replace(/[\t\r\n]/g, '');
            
            // remove whitespace from template instructions
            t = t.replace(/(<%)\s*?(\S+)/g, '$1$2');
            
            // insert tabs and use them later to split on
            t = t.replace(/(<%(\s*?(=|:|[a-zA-Z0-9_\-]+))?)/g, '\t$1\t');
            t = t.replace(/(%>)/g, '\t$1\t');
            
            // split into chunks that we can process
            var chunks = t.split('\t');
            
            var code = []; // store code in array first
            var extcode = []; // external code that should be included first
            var mode = 'text'; // default mode
            
            // process every chunk
            var l = chunks.length;
            for (var x = 0; x < l; x++) {
                var c = chunks[x];
                
                var match = _matcher[c];
                if (match) { // first try to find a match on this chunk
                    var m = match(c, mode, code, extcode, _templates, _tags, _options);
                    if (m) mode = m; // and set the new mode if we got any
                } else { // if no match then we should process the chunk
                    var proc = _processor[mode];
                    if (proc) proc(c, mode, code, extcode, _templates, _tags, _options);
                }
            }
            
            // create function code
            _code = "\
            var __o = [];var __extend = null;var __b = {};var __eb = blocks || {};\
            " + extcode.join('') + "\
            with (obj) { \
                " + code.join('') + "\
            }\
            if (__extend) {\
                return __extend(obj, __b);\
            } else {\
                return __o.join('');\
            }";
            
            // create the render fucntion
            try {
                _fn = new Function("obj", "blocks", _code);
            } catch (e) {
                throw new Error('template.js: could not parse template.\n' + 
                    '[DEBUG] generated code:\n' + _code + '\n' +
                    '[DEBUG] original message:\n' + e.message);
            }
            
            // clean up
            self.clean();
            
            return self;
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        self.render = function(data, templates, tags) {
            self.parse(templates, tags);
            return _fn(data);
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        return self;
    };
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    ns.template.templates = {};
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    ns.template.tags = {};
    
    /* ---------------------------------------------------------------------------
    text tag
    --------------------------------------------------------------------------- */
    ns.template.tags.text = function(matcher, processor) {
        
        // escaping / quote code taken from Douglas Crockfords json2.js
        // https://github.com/douglascrockford/JSON-js/blob/master/json2.js
        
        var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
        var meta = {'\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"' : '\\"', '\\': '\\\\'};
        
        var quote = function(string) {
            // If the string contains no control characters, no quote characters, and no
            // backslash characters, then we can safely slap some quotes around it.
            // Otherwise we must also replace the offending characters with safe escape
            // sequences.
            escapable.lastIndex = 0;
            return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
                var c = meta[a];
                return typeof c === 'string' ? c :
                    '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            }) + '"' : '"' + string + '"';
        };
        
        matcher['%>'] = function(chunk, mode, code, extcode, templates, tags, options) {
            return 'text';
        };
        
        processor['text'] = function(chunk, mode, code, extcode, templates, tags, options) {
            code.push('/* text */ __o.push(' + quote(chunk) + ');');
        };
    };
    
    /* ---------------------------------------------------------------------------
    value tag
    --------------------------------------------------------------------------- */
    ns.template.tags.value = function(matcher, processor) {
        
        matcher['<%='] = function(chunk, mode, code, extcode, templates, tags, options) {
            return 'value';
        };
        
        processor['value'] = function(chunk, mode, code, extcode, templates, tags, options) {
            code.push('/* value */ __o.push(' + chunk + ');');
        };
    };
    
    /* ---------------------------------------------------------------------------
    code tag
    --------------------------------------------------------------------------- */
    ns.template.tags.code = function(matcher, processor) {
        
        matcher['<%:'] = function(chunk, mode, code, extcode, templates, tags, options) {
            return 'code';
        };
        
        processor['code'] = function(chunk, mode, code, extcode, templates, tags, options) {
            code.push('/* code */' + chunk);
        };
    };

    /* ---------------------------------------------------------------------------
    block tag
    --------------------------------------------------------------------------- */
    ns.template.tags.block = function(matcher, processor) {
        var blockc = 0;
        var blocks = [];
        
        matcher['<%block'] = function(chunk, mode, code, extcode, templates, tags, options) {
            blockc++;
            return 'block';
        };

        matcher['<%endblock'] = function(chunk, mode, code, extcode, templates, tags, options) {
            return 'endblock';
        };
        
        processor['block'] = function(chunk, mode, code, extcode, templates, tags, options) {
            var name = blocks[blockc] = im.trim(chunk);
            code.push('/* block */ if (__eb[\'' + name + '\']) __o.push(__eb[\'' + name + '\']);');
            code.push('if (!__eb[\'' + name + '\']) __b[\'' + name + '\'] = (function(){ var __o = [];');
        };

        processor['endblock'] = function(chunk, mode, code, extcode, templates, tags, options) {
            var name = blocks[blockc];
            code.push('return __o.join(\'\');})(); __o.push(__b[\'' + name +'\']); /* endblock */');
        };
    };

    /* ---------------------------------------------------------------------------
    include tag
    --------------------------------------------------------------------------- */
    ns.template.tags.include = function(matcher, processor) {
        
        matcher['<%include'] = function(chunk, mode, code, extcode, templates, tags, options) {
            return 'include';
        };
        
        processor['include'] = function(chunk, mode, code, extcode, templates, tags, options) {
            var name = im.trim(chunk);
            var ft = templates[name]; // foreign template
            if (!ft) return;
            
            try {
                var fcode = '/* include */ var __' + name + '__include = function(obj, blocks){' +
                    ft.parse(templates, tags).getParsed() + '};';
            } catch (e) {
                throw new Error('im.template: could not include ' + name + 
                    ' because of parse error.\n[DEBUG] original message: ' + e.message);
            }
            
            extcode.push(fcode);
            code.push('__o.push(__' + name + '__include(obj, blocks));');
        };
    };

    /* ---------------------------------------------------------------------------
    include tag
    --------------------------------------------------------------------------- */
    ns.template.tags.extend = function(matcher, processor) {
        
        matcher['<%extend'] = function(chunk, mode, code, extcode, templates, tags, options) {
            return 'extend';
        };
        
        processor['extend'] = function(chunk, mode, code, extcode, templates, tags, options) {
            var name = im.trim(chunk);
            var ft = templates[name]; // foreign template
            if (!ft) return;
            
            try {
                var fcode = '/* extend ' + name + ' */ var __extend = function(obj, blocks){' + 
                    ft.parse(templates, tags).getParsed() + '};';
            } catch (e) {
                throw new Error('im.template: could not extend ' + name + 
                    ' because of parse error.\n[DEBUG] original message: ' + e.message);
            }
            
            extcode.push(fcode);
        };
    };
    
})(window.im || window);