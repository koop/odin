/*
 * observable
 * https://github.com/koop/events
 *
 * Copyright (c) 2012 Daryl Koopersmith
 * Licensed under the GPL license, version 2 or greater.
 */

if ( typeof wp === 'undefined' )
	var wp = {};

(function( exports, _ ) {
	var Observable = function() {
		this.set.apply( this, arguments );
	};

	_.extend( Observable.prototype, exports.Events.mixin, {
		get: function() {
			return this._value;
		},

		update: function( to ) {
			this._value = to;
			return this;
		},

		set: function( to ) {
			var from = this.get();

			if ( from === to )
				return this;

			this.update.apply( this, arguments );
			to = this.get();

			this.trigger( 'change', to, from );
			return this;
		},

		_proxiedSet: function() {
			if ( ! this.__proxiedSet )
				this.__proxiedSet = _.bind( this.set, this );
			return this.__proxiedSet;
		},

		pull: function() {
			var set = this._proxiedSet();

			_.each( arguments, function( target ) {
				target.on( 'change', set );
			});
			return this;
		},

		unpull: function() {
			var set = this._proxiedSet();

			_.each( arguments, function( target ) {
				target.off( 'change', set );
			});
			return this;
		},

		sync: function() {
			var self = this;
			_.each( arguments, function( target ) {
				self.pull( target );
				target.pull( self );
			});
			return this;
		},

		unsync: function() {
			var self = this;
			_.each( arguments, function( target ) {
				self.unpull( target );
				target.unpull( self );
			});
			return this;
		}
	});

	// Sharing is caring.
	exports.Observable = Observable;

}( wp, _ ) );
