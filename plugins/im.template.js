/* ---------------------------------------------------------------------------
im.template

Supports:
    * Getting values with {%=value%}
    * Executing code with {%:alert('x')%}
    * Includes
    * Extending ala Django templates
    * Loading custom modules
    * Setting default modules
    * Cloning into a fresh clean environment
    * Overriding anything... :)

Todo:
    * find a way to deal with template library loading and such...
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
        var _fn, _code, _mycode,
            _matcher, _processor, 
            _templates, _modules, 
            _helpers, 
            _initialized;
        
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
            
            // initialize parser & standard helpers
            var defaults = ns.template.defaults.modules;
            for (var x = 0; x < defaults.length; x++) {
                var mod = _modules[defaults[x]];
                if (mod) {
                    if (mod.parser) mod.parser(_matcher, _processor, _modules, _options);
                    if (mod.helpers) mod.helpers(_helpers, _modules, _options);
                }
            }
            
            _initialized = true;
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        var createFn = function(code) {
            try {
                return new Function("obj", "blocks", "helpers", "modules", "state", code);
            } catch (e) {
                alert(code.split('\n')[e.line - 1]);
                throw new Error('template.js: could not parse template.\n' + 
                    '[DEBUG] generated code:\n' + code + '\n' +
                    '[DEBUG] original message:\n' + e.message);
            }
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        var get_chunks = function(template) {
            
            var t = template + '';
            
            // remove \r so we can do something with it later
            t = t.replace(/[\r]/g, '');
            
            // remove whitespace from template instructions
            t = t.replace(/(<%)\s*?(\S+)/g, '$1$2');
            
            // insert \r and use them later to split on
            t = t.replace(/(<%(\s*?(=|:|[a-zA-Z0-9_\-]+))?)/g, '\r$1\r');
            t = t.replace(/(%>)/g, '\r$1\r');
            
            // split into chunks that we can process
            var chunks = t.split('\r');
            
            return chunks;
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        self.loadParsed = function(code, templates, modules) {
            self.reset();
            init(templates, modules);
            _code = code;
            _fn = createFn(code);
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
            _modules = {};
            _code = undefined;
            _fn = undefined;
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        self.clean = function() {
            _templates = {};
            _matcher = {};
            _processor = {};
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        self.parse = function(templates, modules) {
            if (_options.reparse === true) self.reset();
            if (_fn) return self;
            init(templates, modules);
            
            var chunks = get_chunks(_template);
            
            // create parser object
            var parser = {
                code : [], // code that runs within the template
                extcode : [], // code that should be included as 'external' code
                mode : 'text', // current mode
                chunk : undefined, // current chunk being processed
                chunkc : 0, // index of current chunk being processed
                chunks : chunks,
                templates : _templates,
                modules : _modules,
                options : _options,
                processor : _processor,
                matcher : _matcher,
                get_chunks : get_chunks
            };
            
            // process every chunk
            for (parser.chunkc = 0; parser.chunkc < chunks.length; parser.chunkc++) {
                
                // get chunk
                var c = chunks[parser.chunkc];
                if (!c) continue;
                
                // set chunk
                parser.chunk = c;
                
                // first try to find a match on this chunk
                var match = _matcher[parser.chunk];
                
                if (match) { // if match, execute it
                    var m = match(parser);
                    if (m) parser.mode = m; // and set the new mode if we got any
                    
                } else { // if no match then we should process the chunk in the current mode
                    var proc = _processor[parser.mode];
                    if (proc) proc(parser);
                }
            }
            
            _mycode = parser.code.join('');
            
            // create function code
            _code = "\
            var __modules = modules, __state = state, __helpers = helpers, __o = [], __extend = null, __b = {}, __eb = blocks;\
            " + parser.extcode.join('') + "\
            with (__helpers) {\
                with (obj) { \
                    " + _mycode + "\
                }\
            }\
            if (__extend) {\
                return __extend(obj, __b, __helpers, __modules, __state);\
            } else {\
                return __o.join('');\
            }";
            
            _code = _code.replace(/([\{;])/g, '$1\n');
            
            // create the render function
            _fn = createFn(_code);
            
            // clean up
            self.clean();
            
            return self;
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        self.render = function(data, templates, modules) {
            self.parse(templates, modules);
            //self.validate();
            try {
                return _fn(data, {}, _helpers, _modules, {});
            } catch (e) {
                console.dir(e);
                throw new Error("im.template: could not render template. " + 
                    "[DEBUG] original message: " + e.message);
            }
            
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
    
    --------------------------------------------------------------------------- */
    ns.template.modules.load = (function(){
        var self = {};
        
        var _unknownMessage = function(name) {
            return 'im.template: module ' + name + ' is unknown.';
        };
        
        self.helpers = function(helpers, modules, options) {
            /* ---------------------------------------------------------------------------
            used internally only
            --------------------------------------------------------------------------- */
            helpers.$__load = function(name, state) {
                var s = state.loaded = state.loaded || {};
                if (s[name]) return;
                var mod = modules[name];
                if (!mod) throw new Error(_unknownMessage(name));
                try {
                    if (mod.helpers) mod.helpers(helpers, modules, options);
                } catch (e) {
                    throw new Error('im.template could not load module ' + name + 
                        ' because of error. [DEBUG] original message: ' + e.message);
                }
                
                s[name] = true;
            };
        };
        
        self.parser = function(matcher, processor, modules, options) {
            matcher['<%load'] = function(parser) {
                return 'load';
            };
            
            processor['load'] = function(p) {
                var mods = p.chunk.split(/[,\s]/);

                var l = mods.length;
                while (l--) {
                    var n = mods[l];
                    if (!n || n == ',') continue;
                    
                    if (p.modules[n]) {
                        p.code.push('$__load("' + n + '", __state);');
                    } else {
                        throw new Error(_unknownMessage(n));
                    }
                }
            };
        };
        
        return self;
    })();
    
    // add as default module
    ns.template.defaults.modules.push('load');
    
    /* ---------------------------------------------------------------------------
    text tag
    --------------------------------------------------------------------------- */
    ns.template.modules.text = (function(){
        var self = {};
        
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
        
        self.helpers = function(helpers, modules, options) {
            helpers.$trim = im.trim;
            helpers.$isString = im.isString;
        };
        
        self.parser = function(matcher, processor, modules, options) {
            matcher['%>'] = function(p) {
                return 'text';
            };

            processor['text'] = function(p) {
                p.code.push('__o.push(' + quote(p.chunk) + ');');
            };
        };
        
        return self;
    })();
    
    // add as default module
    ns.template.defaults.modules.push('text');
    
    /* ---------------------------------------------------------------------------
    value tag
    --------------------------------------------------------------------------- */
    ns.template.modules.value = {};
    ns.template.modules.value.parser = function(matcher, processor, modules, options) {
        matcher['<%='] = function(p) {
            return 'value';
        };

        processor['value'] = function(p) {
            p.code.push('__o.push(' + p.chunk + ');');
        };
    };
    
    // add as default module
    ns.template.defaults.modules.push('value');
    
    /* ---------------------------------------------------------------------------
    code tag
    --------------------------------------------------------------------------- */
    ns.template.modules.code = {};
    ns.template.modules.code.parser = function(matcher, processor, modules, options) {
        matcher['<%:'] = function(p) {
            return 'code';
        };

        processor['code'] = function(p) {
            p.code.push(p.chunk);
        };
    };
    
    // add as default module
    ns.template.defaults.modules.push('code');

    /* ---------------------------------------------------------------------------
    block tag
    --------------------------------------------------------------------------- */
    ns.template.modules.block = {};
    ns.template.modules.block.parser = function(matcher, processor, modules, options) {
        var blockc = 0;
        var blocks = [];
        
        matcher['<%block'] = function(p) {
            blockc++;
            return 'block';
        };

        matcher['<%endblock'] = function(p) {
            return 'endblock';
        };

        processor['block'] = function(p) {
            var name = blocks[blockc] = im.trim(p.chunk);
            p.code.push('if (__eb[\'' + name + '\'] !== undefined){__o.push(__eb[\'' + name + '\']);}');
            p.code.push('if (__eb[\'' + name + '\'] === undefined){__b[\'' + name + 
                '\'] = (function(){ var __o = [];');
        };

        processor['endblock'] = function(p) {
            var name = blocks[blockc];
            p.code.push('return __o.join(\'\');})();} if (__b[\'' + name + '\'] !== undefined) {__o.push(__b[\'' + 
                name +'\']);} /* endblock */');
        };
    };
    
    // add as default module
    ns.template.defaults.modules.push('block');

    /* ---------------------------------------------------------------------------
    include tag
    --------------------------------------------------------------------------- */
    ns.template.modules.include = {};
    ns.template.modules.include.parser = function(matcher, processor, modules, options) {
        
        matcher['<%include'] = function(p) {
            return 'include';
        };

        processor['include'] = function(p) {
            var name = im.trim(p.chunk);
            var ft = p.templates[name]; // foreign template
            if (!ft) throw new Error("im.template: could not include " + name + 
                ' because template is unknown.');

            try {
                var fcode = 'var __' + name + '__include = function(obj, blocks){' +
                    ft.parse(p.templates, modules).getParsed() + '};';
            } catch (e) {
                throw new Error('im.template: could not include ' + name + 
                    ' because of parse error.\n[DEBUG] original message: ' + e.message);
            }

            p.extcode.push(fcode);
            p.code.push('__o.push(__' + name + 
                '__include(obj, {}, __helpers, __modules, __state));');
        };
    };
    
    // add as default module
    ns.template.defaults.modules.push('include');

    /* ---------------------------------------------------------------------------
    include tag
    --------------------------------------------------------------------------- */
    ns.template.modules.extend = {};
    ns.template.modules.extend.parser = function(matcher, processor, modules, options) {
            
        var c = 0;
        
        matcher['<%extend'] = function(p) {
            return 'extend';
        };

        processor['extend'] = function(p) {
            var name = im.trim(p.chunk);
            
            c = c + 1;
            if (c > 1) throw new Error("im.template: could not extend " + name + 
                " because the template already extends another template.");
            
            var ft = p.templates[name]; // foreign template
            if (!ft) throw new Error("im.template: could not extend " + name + 
                " because the template is unknown.");
            
            try {
                var fcode = '__extend = function(obj, blocks, helpers, modules, state){' + 
                    ft.parse(p.templates, modules).getParsed() + '};';
            } catch (e) {
                throw new Error('im.template: could not extend ' + name + 
                    ' because of parse error.\n[DEBUG] original message: ' + e.message);
            }
            
            p.extcode.push(fcode);
        };
    };
    
    // add as default module
    ns.template.defaults.modules.push('extend');
    
    ns.template.modules.i18n = {};
    ns.template.modules.i18n.parser = function(matcher, processor, modules, options) {
        
        var blockc = 0,
            blocks = [],
            dict_nl = {
                "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo<%='XXXXX'%>" : "haha leuk ja <%='XXXXX'%>, nee echt."
            };
        
        matcher['<%blocktrans'] = function(p) {
            return 'blocktrans';
        };
        
        processor['blocktrans'] = function(p) {
            var locale = options.locale,
                end,
                start = p.chunkc,
                start_content,
                end_content,
                chunks = p.chunks;
                
            for (var x = start; x < chunks.length; x++) {
                var chunk = chunks[x];
                if (chunk == '%>' && end_content === undefined && start_content === undefined) start_content = x + 1;
                if (chunk == '<%blocktrans') throw new Error('no nested blocktrans allowed');
                if (chunk == '<%endblocktrans') {;
                    end_content = x - 1;
                }
                if (chunk == '%>' && end_content !== undefined) {
                    end = x + 1;
                    break;
                }
            }
            
            var content = chunks.slice(start_content, end_content);
            var key = im.trim(content.join(''));
            var trans = dict_nl[key];
            if (trans) {
                // parse trans, with current modules, templates, and options
                var inject = ['', '', '', '', '%>'].concat(p.get_chunks(trans));
                // inject chunks
                var before = chunks.slice(0, start-1);
                var after = chunks.slice(end, chunks.length);
                
                //console.dir(before);
                //console.dir(after);
                
                //alert(before.join('') + after.join(''))
                
                chunks.splice(0, chunks.length);
                var new_chunks = [].concat(before, inject, after);
                var l = new_chunks.length;
                for (var x = 0; x < l; x++) {
                    chunks[x] = new_chunks[x];
                }
                
                //alert(chunks.length);
            }
        };
        
    };
    
    ns.template.defaults.modules.push('i18n');
    
})(window.im || window);