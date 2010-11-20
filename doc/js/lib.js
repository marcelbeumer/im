(function(ns){
    
    /* ---------------------------------------------------------------------------
    ns
    --------------------------------------------------------------------------- */
    ns.doc = {};
    
    /* ---------------------------------------------------------------------------
    template lib
    --------------------------------------------------------------------------- */
    var tpl = ns.doc.tpl = {};
    
    /* ---------------------------------------------------------------------------
    tpl.source - generates function that shows source viewer for URL
        param url: url of script
        param match: "indexOf" match that determines line number
    --------------------------------------------------------------------------- */
    tpl.source = function(url, match) {
        return function() {
            
            // get source
            var script = im.xhr.get(url).responseText;
            var lines = script.split('\n');
            var line = 1;
            
            // get line number based on match
            for (var x = 0; x < lines.length; x++) {
                if (lines[x].indexOf(match) != -1) {line = x; break;}
            }
            
            // generate markup
            var html = 
                '<div><strong>' + url + ':</strong></div>\
                <textarea class="code api-source" line="' + line + '">' + script + '\
                </textarea>\
                ';
            return html;
        };
    };
    
    /* ---------------------------------------------------------------------------
    tpl.template - generate function that will render a template
        param t: template name/path
        param dir: basedir for templates (default = 'templates/')
    --------------------------------------------------------------------------- */
    tpl.template = function(t, dir) {
        return function() {
            var template = im.xhr.get((dir || 'templates/') + t).responseText;
            return Mustache.to_html(template, this);
        };
    };
    
    /* ---------------------------------------------------------------------------
    tpl.list - generate function that will render a list of the document structure.
        param t: object of the menu structure.
    --------------------------------------------------------------------------- */
    tpl.list = function(t) {
        return function() {
            if (!this._sub) return '';
            var out = '<ul>';
            for (var name in this._sub) {
                out += '<li>' + name + '</li>';
            }
            out += '</ul>';
            return out;
        };
    };
    
})(window);