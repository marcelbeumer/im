(function(ns){
    
    /* ---------------------------------------------------------------------------
    ns references
    --------------------------------------------------------------------------- */
    var doc = ns.doc;
    
    /* ---------------------------------------------------------------------------
    Base templates
    --------------------------------------------------------------------------- */
    var BASETEMPLATE_TOPIC = 'base-topic.html';
    var BASETEMPLATE_SOURCE = 'base-source.html';
    var DEFAULT_DOCPATH = 'intro';
    
    /* ---------------------------------------------------------------------------
    renderNavigation - renders the navigation structure (stateless). 
    Only done once.
    --------------------------------------------------------------------------- */
    var renderNavigation = function() {
        
        /* ---------------------------------------------------------------------------
        local renderNavigationStructure - renders navigation structure
        --------------------------------------------------------------------------- */
        var renderNavigationStructure = function(path, structure, list) {
            for (var name in structure) {
                var c = structure[name];
                var cp = path + (path == '' ? '' : '.') + name;
                var item = im('<li><a href="#" class="doc-link" doc-path="' + 
                    cp + '">' + 
                    (c.title || name) + '</a></li>');
                if (c._sub) {
                    item.addClass('has-sub');
                    var sub = im('<ul></ul>');
                    renderNavigationStructure(cp, c._sub, sub);
                    item.append(sub);
                }
                list.append(item);
            }
        };
        
        var navi = im('.navi-inner');
        var list = im('<ul></ul>');
        renderNavigationStructure('', doc.STRUCTURE, list);
        navi.append(list);
    };
    
    /* ---------------------------------------------------------------------------
    doc.setPage - sets page to path id.
        param id: path id, ex: 'api.css.chains.animate'
    --------------------------------------------------------------------------- */
    doc.setPage = function(id) {
        var c = doc.STRUCTURE;
        var path = id.split('.');
        var level = 0;
        for (var x = 0; x < path.length; x++) {
            var p = path[x];
            if (level == 0) {
                if (c[p]) c = c[p];
            } else {
                if (c._sub && c._sub[p]) c = c._sub[p];
            }
            level++;
        }
        if (!c.title) c.title = p;
        var template = im.xhr.get('templates/' + (c.source ? BASETEMPLATE_SOURCE : BASETEMPLATE_TOPIC)).responseText;
        var html = Mustache.to_html(template, c) + '';
        var content = im('.content');
        
        // update navi state
        im('.navi-inner li').removeClass('active').each(function(){
            var liid = im(this).find('a').el(0).getAttribute('doc-path');
            if (liid == id) {
                im(this).addClass('active').parents('.navi li').addClass('open');
            }
        });
        
        // set has for bookmarkability
        document.location.hash = id;
        
        // inject and init content
        content.html(html);
        im.scan('content', content);
    };
    
    /* ---------------------------------------------------------------------------
    code viewer trigger
    --------------------------------------------------------------------------- */
    im.scan.register('content', '.code', function(){
        var lineNumberAttr = this.getAttribute('line');
        var lineNumber = lineNumberAttr ? parseInt(lineNumberAttr, 10) : -1;
        var code = this.innerHTML.split('\n');
        var that = this;
        var viewer = im('<div class="code-viewer"></div>');
        im(code).each(function(i){
            var code = this.replace('>', '&gt;').replace('<', '&lt;');
            var line = im('<div><span>' + (i + 1) + '</span><pre>' + code + '</pre></div>');
            line.css({position : 'relative'});
            if (lineNumber > -1) {
                if (i < (lineNumber - 3)) line.hide();
                if (i == lineNumber) line.addClass('current');
                if (i > (lineNumber + 20)) line.hide();
            }
            viewer.append(line);
        });
        var viewAll = function(viewer) {
            var i = im(viewer);
            i.unbind('click');
            i.find('> .view-all').remove();
            i.addClass('code-viewer-all');
            i.css({height: '500px', overflow: 'auto'});
            var lc = 0;
            i.find('> div').show().end().find('.current').each(function(x){
                i.el(0).scrollTop = this.offsetTop - 200;
            });                
        };
        if (lineNumber > -1) {
            var button = im('<a class="view-all" href="#">See all code</a>').bind('click', function(){
                viewAll(this.parentNode);
                return false;
            });
            viewer.append(button);
            viewer.bind('click', function(){
                viewAll(this);
            });
        }
        this.parentNode.insertBefore(viewer.el(0), this);
        im(this).remove();
    });
    
    /* ---------------------------------------------------------------------------
    onready app initializer
    --------------------------------------------------------------------------- */
    im(function(){
        
        /* ---------------------------------------------------------------------------
        doc-link live handler
        --------------------------------------------------------------------------- */
        im.live(document.body, 'a.doc-link', 'click', function(){
            
            // if we are inside a navi, we update the open/closed state in that part of the tree
            if (im(this).parents('.navi').length > 0 && im(this).parent().hasClass('has-sub')) {
                var i = im(this).parent();
                if (i.hasClass('active') && i.hasClass('open')) i.removeClass('open'); else i.addClass('open');
            }
            
            // get doc-path and set page
            var p = this.getAttribute('doc-path');
            if (p) doc.setPage(p);
            return false;
        });
        
        /* ---------------------------------------------------------------------------
        expand-all live handler. Expands all navi items.
        --------------------------------------------------------------------------- */
        im.live(document.body, 'a.expand-all', 'click', function(){
            im('.navi li.has-sub').addClass('open');
            return false;
        });
        
        
        // render the navigation
        renderNavigation();
        
        // get hash and set the page
        var hash = (document.location.hash + '').substr(1);
        doc.setPage(hash || DEFAULT_DOCPATH);
    });
    
})(window);