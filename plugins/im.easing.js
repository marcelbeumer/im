im.register('easing', function (im, window, document) {
    
    im.easing = {
    	LINEAR: function (t) {
    		return t;
    	},
    	EASEINQUAD: function(t) {
    		return t * t;
    	},
    	EASEOUTQUAD: function(t) {
    		return - t * ( t - 2 );
    	},
    	EASEINOUTQUAD: function(t) {
    		if ( ( t *= 2 ) < 1 ) return 0.5 * t * t;
    		return - 0.5 * ( --t * ( t - 2 ) - 1 );
    	},
    	EASEINCUBIC: function(t) {
    		return t * t * t;
    	},
    	EASEOUTCUBIC: function(t) {
    		return --t * t * t + 1;
    	},
    	EASEINOUTCUBIC: function(t) {
    		if ( ( t *= 2 ) < 1 ) return 0.5 * t * t * t;
    		return 0.5 * ( ( t -= 2 ) * t * t + 2 );
    	},
    	EASEINSIN: function(t) {
    		return - Math.cos( t * Math.PI / 2 ) + 1;
    	},
    	EASEOUTSIN: function(t) {
    		return Math.sin( t * Math.PI / 2 );
    	},
    	EASEINOUTSIN: function(t) {
    		return - 0.5 * ( Math.cos( Math.PI * t ) - 1 );
    	},
    	EASEINEXP: function(t) {
    		return t == 0 ? 0 : Math.pow( 2, 10 * ( t - 1 ) );
    	},
    	EASEOUTEXP: function(t) {
    		return t == 1 ? 1 : - Math.pow( 2, - 10 * t ) + 1;
    	},
    	EASEINOUTEXP: function(t) {
    		if ( t == 0 ) return 0;
    	        if ( t == 1 ) return 1;
    	        if ( ( t *= 2 ) < 1 ) return 0.5 * Math.pow( 2, 10 * ( t - 1 ) );
    	        return 0.5 * ( - Math.pow( 2, - 10 * ( t - 1 ) ) + 2 );
    	}
    };
    
});