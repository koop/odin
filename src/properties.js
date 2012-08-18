/*
 * properties
 * https://github.com/koop/events
 *
 * Copyright (c) 2012 Daryl Koopersmith
 * Licensed under the GPL license, version 2 or greater.
 */

if ( typeof wp === 'undefined' )
	var wp = {};

(function( exports, _ ) {
	var Observable = exports.Observable,
		Events     = exports.Events,
		Properties = function() {};

	_.extend( Properties.prototype, Events.mixin, {
		observable: function( key ) {
			this.properties = this.properties || {};
			if ( this.properties[ key ] )
				return this.properties[ key ].observable;
		},

		add: function( key, observable ) {
			var self = this,
				change = function() {
					self.trigger.apply( self, [ 'change:' + key ].concat( _.toArray( arguments ) ) );
				};

			// Do not replace existing properties.
			// Calling observable() ensures this.properties exists.
			if ( this.observable( key ) )
				return this;

			// add( key )
			// If we don't have an observable, create an empty one.
			observable = observable || new Observable();

			// Track the observable and change:key callbacks.
			this.properties[ key ] = {
				observable: observable,
				change: change
			};

			// Bind the change:key event.
			observable.on( 'change', change );

			this.trigger( 'add:' + key + ' add', key, observable );
			return this;
		},

		remove: function( key ) {
			// Calling observable() ensures this.properties exists.
			var observable = this.observable( key );

			// Check if there is a property to remove.
			if ( ! observable )
				return this;

			// Remove the change:key event.
			observable.off( 'change', this.properties[ key ].change );
			delete this.properties[ key ];

			this.trigger( 'remove:' + key + ' remove', key, observable );
			return this;
		},

		set: function( key ) {
			var self = this,
				observable;

			// Handle { key: value } objects.
			if ( _.isObject( key ) ) {
				_.each( key, function( v, k ) {
					self.set( k, v );
				});
				return this;
			}

			// Fetch the observable or create a new one.
			observable = this.observable( key ) || this.add( key ).observable( key );
			observable.set.apply( observable, _.rest( arguments ) );

			// Trigger the change event.
			// The change:key event is automatically triggered whenever
			// the property is updated.
			this.trigger( 'change', key, observable );
			return this;
		}
	});

	// Proxy observable methods over to each observable object.
	_.each(['get','pull','unpull','sync','unsync'], function( method ) {
		Properties.prototype[ method ] = function( key ) {
			var observable = this.observable( key ),
				observables, result;

			if ( ! observable )
				return;

			// Try to convert arguments to observables (so we can use strings).
			observables = _.chain( arguments ).rest().map( function( value ) {
				return _.isObject( value ) ? value : this.observable( value );
			}, this ).value();

			// If the observable returns itself, return this instead.
			result = observable[ method ].apply( observable, observables );
			return result === observable ? this : result;
		};
	});

	// Sharing is caring.
	exports.Properties = Properties;

}( wp, _ ) );
