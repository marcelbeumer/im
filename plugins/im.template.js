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
    * Proper debugging by analysing generated code in debug mode and rendering in a try-catch
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
        self.getCode = function() {
            return _code;
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        self.reset = function() {
            _templates = {};
            _tags = {};
            _matcher = {};
            _processor = {};
            _initialized = false;
            _code = undefined;
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        self.parse = function(templates, tags) {
            if (_options.reparse === true) self.reset();
            init(templates, tags);
            if (_code) return;
            
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
            _code = "var o = []; var extend = null; var b = {}; var eb = blocks || {};" + extcode.join('') +
                "with (obj) { " + 
                    code.join('') + 
                "} if (extend) {return extend(obj, b);} else {return o.join('');}";
            
            // create the render fucntion
            _fn = new Function("obj", "blocks", _code);
            
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
        matcher['%>'] = function(chunk, mode, code, extcode, templates, tags, options) {
            return 'text';
        };
        
        processor['text'] = function(chunk, mode, code, extcode, templates, tags, options) {
            code.push('/* user txt */ o.push(\'' + chunk.replace(/'/g, "\\'") + '\');');
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
            code.push('/* user value */ o.push(' + chunk + ');');
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
            code.push('/* user code */' + chunk);
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
            code.push('if (eb[\'' + name + '\']) o.push(eb[\'' + name + '\']);');
            code.push('if (!eb[\'' + name + '\']) b[\'' + name + '\'] = (function(){ var o = [];');
        };

        processor['endblock'] = function(chunk, mode, code, extcode, templates, tags, options) {
            var name = blocks[blockc];
            code.push('return o.join(\'\');})(); o.push(b[\'' + name +'\']);');
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
            
            var fcode = '/* include */ var ' + name + '__include__ = function(obj, blocks){' +
                ft.parse(templates, tags).getCode() + '};';
            extcode.push(fcode);
            code.push('o.push(' + name + '__include__(obj, blocks));');
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
            
            var fcode = '/* extend ' + name + ' */ var extend = function(obj, blocks){' + 
                ft.parse(templates, tags).getCode() + '};';
            extcode.push(fcode);
        };
    };
    
})(window.im || window);