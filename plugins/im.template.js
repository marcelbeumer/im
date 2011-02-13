/* ---------------------------------------------------------------------------
im.template
--------------------------------------------------------------------------- */
(function(ns){
    
    /* ---------------------------------------------------------------------------
    
    --------------------------------------------------------------------------- */
    ns.template = function(template) {
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        var self = {};
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        var _template = template;
        var _fn;
        var _code;
        var _library = {};
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        self.getCode = function() {
            return _code;
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        self.parse = function(library) {
            
            // get library
            var lib = _library = (library || _library);
            
            // template
            var t = _template + '';
            
            // remove tabs, newlines
            t = t.replace(/[\t\r\n]/g, '');
            
            // remove whitespace from template instructions
            t = t.replace(/(<%)\s*?(\S+)/g, '$1$2');
            
            // insert tabs and use them later to split on
            t = t.replace(/(<%(\s*?(=|:|block|endblock|extend|include))?)/g, '\t$1\t');
            t = t.replace(/(%>)/g, '\t$1\t');
            
            // split into chunks that we can process
            var chunks = t.split('\t');
            
            var code = []; // store code in array first
            var extcode = []; // external code that should be included first
            var mode = 'text'; // default mode
            var blockc = 0;
            var blocks = [];
            
            // process every chunk
            var l = chunks.length;
            for (var x = 0; x < l; x++) {
                var c = chunks[x];
                if (c == '<%=') { // value
                    mode = 'value';
                } else if (c == '<%:') { // code
                    mode = 'code';
                } else if (c == '%>'){  // back to text
                    mode = 'text';
                } else if (c == '<%block') {
                    // TODO
                    mode = 'block';
                    blockc++;
                } else if (c == '<%endblock') {
                    mode = 'endblock';
                } else if (c == '<%extend') {
                    mode = 'extend';
                } else if (c == '<%include') {
                    mode = 'include';
                } else { // process within mode
                    
                    if (mode == 'text') {
                        code.push('/* user txt */ o.push(\'' + c.replace(/'/g, "\\'") + '\');');
                    } else if (mode == 'value') {
                        code.push('/* user value */ o.push(' + c + ');');
                    } else if (mode == 'code') {
                        code.push('/* user code */' + c);
                    } else if (mode == 'extend') {
                        var name = im.trim(c);
                        var ft = _library[name]; // foreign template
                        if (!ft) continue;
                        var fcode = '/* extend ' + name + ' */ var extend = function(obj, blocks){' + 
                            ft.parse(library).getCode() + '};';
                        extcode.push(fcode);
                    } else if (mode == 'include') {
                        var name = im.trim(c);
                        var ft = _library[name]; // foreign template
                        if (!ft) continue;
                        var fcode = '/* include */ var ' + name + '__include__ = function(obj, blocks){' +
                            ft.parse(library).getCode() + '};';
                        extcode.push(fcode);
                        code.push('o.push(' + name + '__include__(obj, blocks));');
                    } else if (mode == 'block') {
                        var name = blocks[blockc] = im.trim(c);
                        code.push('if (eb[\'' + name + '\']) o.push(eb[\'' + name + '\']);');
                        code.push('if (!eb[\'' + name + '\']) b[\'' + name + '\'] = (function(){ var o = [];');
                    } else if (mode == 'endblock') {
                        var name = blocks[blockc];
                        code.push('return o.join(\'\');})(); o.push(b[\'' + name +'\']);');
                    }
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
        self.render = function(data, library) {
            _library = (library || _library);
            if (!_fn) self.parse();
            return _fn(data);
        };
        
        /* ---------------------------------------------------------------------------
        
        --------------------------------------------------------------------------- */
        return self;
    };
    
})(window.im || window);