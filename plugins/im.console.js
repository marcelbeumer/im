(function(){
    
    var root;
    var getRoot = function() {
        if (root) return root;
        
        try {
            var c = im.create('<div style="position:absolute;right:0;background-color:#fff;top:0;border:1px solid #000;padding:10px;"></div>');
            document.body.appendChild(c);
            var button = im.create('<input type="text"/>');
            im(button).bind('keyup', function(e){
               if ((e.which && e.which == 13) || (e.keyCode && e.keyCode == 13)) {
                   console.info(eval(this.value));
                   this.value = '';
               }
            });
            c.appendChild(button);
            root = c;
            return c;
        } catch(e) {
            throw new Error("console: could not create root node. Is the document ready?");
        }
    };
    if (!window.console) {
        
        window.console = {};
        
        var m = ['profiles', 'profileEnd', 'count', 'time', 'warn', 'timeEnd', 'log', 'dirxml', 'debug', 'assert', 'group', 'info', 'profile', 'trace', 'markTimeline', 'dir', 'error', 'groupEnd'];
        
        var ml = m.length;
        while (ml--) window.console[m[ml]] = function(){};
        
        window.console.info = function(s){
            getRoot().appendChild(im.create('<div>' + s + '</div>'));
        };
    }
})();
