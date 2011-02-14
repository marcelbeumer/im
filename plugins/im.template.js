/* ---------------------------------------------------------------------------
im.template

Supports:
    * Getting values with {%=value%}
    * Executing code with {%:alert('x')%}
    * Includes
    * Extending ala Django templates
    * Custom modules
    * Overriding anything... :)

Todo:
    * find a way to deal with module loading (<% load %> ala Django?)
    * be able to set default modules
    * find a way to deal with template library loading and such...
    * more debugging facilities
--------------------------------------------------------------------------- */
(function(ns){
    
    var callee = arguments.callee;
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    ns.template = {};
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    ns.template.create = function(template, options) {
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
        var _modules;
        var _helpers;
        var _initialized;
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        var init = function(templates, modules) {
            if (_initialized) return;
            
            // reset all variables
            self.reset();
            
            // merge objects
            im.extend(_templates, ns.template.templates);
            im.extend(_templates, templates || {});
            im.extend(_modules, ns.template.modules);
            im.extend(_modules, modules || {});
            
            // initialize matcher and processor
            var defaults = ns.template.defaults.modules;
            for (var x = 0; x < defaults.length; x++) {
                var mod = _modules[defaults[x]];
                if (mod) mod(_matcher, _processor, _helpers);
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
        self.reset = function() {
            self.clean();
            _initialized = false;
            _helpers = {};
            _code = undefined;
            _fn = undefined;
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        self.clean = function() {
            _templates = {};
            _modules = {};
            _matcher = {};
            _processor = {};
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        self.parse = function(templates, modules) {
            if (_options.reparse === true) self.reset();
            if (_fn) return self;
            init(templates, modules);
            
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
                    var m = match(c, mode, code, extcode, _templates, _modules, _options);
                    if (m) mode = m; // and set the new mode if we got any
                } else { // if no match then we should process the chunk
                    var proc = _processor[mode];
                    if (proc) proc(c, mode, code, extcode, _templates, _modules, _options);
                }
            }
            
            // create function code
            _code = "\
            var __helpers = helpers || {}; var __o = [];var __extend = null;var __b = {};var __eb = blocks || {};\
            " + extcode.join('') + "\
            with(__helpers){\
                with (obj) { \
                    " + code.join('') + "\
                }\
            }\
            if (__extend) {\
                return __extend(obj, __b, __helpers);\
            } else {\
                return __o.join('');\
            }";
            
            // create the render fucntion
            try {
                _fn = new Function("obj", "blocks", "helpers", _code);
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
        self.render = function(data, templates, modules) {
            self.parse(templates, modules);
            return _fn(data, null, _helpers);
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        return self;
    };
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    ns.template.env = function(ns) {
        var o = {};
        callee(o);
        return o.template;
    };
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    ns.template.defaults = {modules : []};
    ns.template.templates = {};
    ns.template.modules = {};
    
    /* ---------------------------------------------------------------------------
    text tag
    --------------------------------------------------------------------------- */
    ns.template.modules.text = function(matcher, processor, helpers) {
        
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
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        helpers.$trim = im.trim;
        helpers.$isString = im.isString;
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        matcher['%>'] = function(chunk, mode, code, extcode, templates, modules, options) {
            return 'text';
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        processor['text'] = function(chunk, mode, code, extcode, templates, modules, options) {
            code.push('/* text */ __o.push(' + quote(chunk) + ');');
        };
    };
    
    // add as default module
    ns.template.defaults.modules.push('text');
    
    /* ---------------------------------------------------------------------------
    value tag
    --------------------------------------------------------------------------- */
    ns.template.modules.value = function(matcher, processor, helpers) {
        
        matcher['<%='] = function(chunk, mode, code, extcode, templates, modules, options) {
            return 'value';
        };
        
        processor['value'] = function(chunk, mode, code, extcode, templates, modules, options) {
            code.push('/* value */ __o.push(' + chunk + ');');
        };
    };
    
    // add as default module
    ns.template.defaults.modules.push('value');
    
    /* ---------------------------------------------------------------------------
    code tag
    --------------------------------------------------------------------------- */
    ns.template.modules.code = function(matcher, processor, helpers) {
        
        matcher['<%:'] = function(chunk, mode, code, extcode, templates, modules, options) {
            return 'code';
        };
        
        processor['code'] = function(chunk, mode, code, extcode, templates, modules, options) {
            code.push('/* code */' + chunk);
        };
    };
    
    // add as default module
    ns.template.defaults.modules.push('code');

    /* ---------------------------------------------------------------------------
    block tag
    --------------------------------------------------------------------------- */
    ns.template.modules.block = function(matcher, processor, helpers) {
        var blockc = 0;
        var blocks = [];
        
        matcher['<%block'] = function(chunk, mode, code, extcode, templates, modules, options) {
            blockc++;
            return 'block';
        };

        matcher['<%endblock'] = function(chunk, mode, code, extcode, templates, modules, options) {
            return 'endblock';
        };
        
        processor['block'] = function(chunk, mode, code, extcode, templates, modules, options) {
            var name = blocks[blockc] = im.trim(chunk);
            code.push('/* block */ if (__eb[\'' + name + '\']) __o.push(__eb[\'' + name + '\']);');
            code.push('if (!__eb[\'' + name + '\']) __b[\'' + name + '\'] = (function(){ var __o = [];');
        };

        processor['endblock'] = function(chunk, mode, code, extcode, templates, modules, options) {
            var name = blocks[blockc];
            code.push('return __o.join(\'\');})(); __o.push(__b[\'' + name +'\']); /* endblock */');
        };
    };
    
    // add as default module
    ns.template.defaults.modules.push('block');

    /* ---------------------------------------------------------------------------
    include tag
    --------------------------------------------------------------------------- */
    ns.template.modules.include = function(matcher, processor, helpers) {
        
        matcher['<%include'] = function(chunk, mode, code, extcode, templates, modules, options) {
            return 'include';
        };
        
        processor['include'] = function(chunk, mode, code, extcode, templates, modules, options) {
            var name = im.trim(chunk);
            var ft = templates[name]; // foreign template
            if (!ft) return;
            
            try {
                var fcode = '/* include */ var __' + name + '__include = function(obj, blocks){' +
                    ft.parse(templates, modules).getParsed() + '};';
            } catch (e) {
                throw new Error('im.template: could not include ' + name + 
                    ' because of parse error.\n[DEBUG] original message: ' + e.message);
            }
            
            extcode.push(fcode);
            code.push('__o.push(__' + name + '__include(obj, blocks));');
        };
    };
    
    // add as default module
    ns.template.defaults.modules.push('include');

    /* ---------------------------------------------------------------------------
    include tag
    --------------------------------------------------------------------------- */
    ns.template.modules.extend = function(matcher, processor, helpers) {
        
        matcher['<%extend'] = function(chunk, mode, code, extcode, templates, modules, options) {
            return 'extend';
        };
        
        processor['extend'] = function(chunk, mode, code, extcode, templates, modules, options) {
            var name = im.trim(chunk);
            var ft = templates[name]; // foreign template
            if (!ft) return;
            
            try {
                var fcode = '/* extend ' + name + ' */ var __extend = function(obj, blocks){' + 
                    ft.parse(templates, modules).getParsed() + '};';
            } catch (e) {
                throw new Error('im.template: could not extend ' + name + 
                    ' because of parse error.\n[DEBUG] original message: ' + e.message);
            }
            
            extcode.push(fcode);
        };
    };
    
    // add as default module
    ns.template.defaults.modules.push('extend');
    
})(window.im || window);