/*
 * events
 * https://github.com/koop/events
 *
 * Copyright (c) 2012 Daryl Koopersmith
 * Licensed under the GPL license, version 2 or greater.
 */

if ( typeof wp === 'undefined' )
	var wp = {};

(function( exports, _ ) {
	var Event, Events,
		slice = Array.prototype.slice;

	/**
	 * EVENT
	 */

	Event = function( options ) {
		_.extend( this, options );
		this.callbacks = [];
		this.context = this;
	};


	_.extend( Event.prototype, {
		/**
		 * Adds a callback to the event.
		 *
		 * @param {object}   options    The callback's options.
		 *        {function} fn         The callback function.
		 *        {object}   context    Optional. The context in which to call the function (the 'this' keyword).
		 *        {object}   namespace  Optional. An object with namespace keys mapped to 'true'.
		 *        {integer}  priority   Optional. Default 10. The priority of the callback.
		 */
		add: function( options ) {
			var defaults, low, mid, high;

			if ( ! options.fn )
				return;

			options = _.defaults( options, {
				priority: 10,
				namespace: {}
			});

			// Cache the callback we'll actually use.
			options.bound = options.context ? _.bind( options.fn, options.context ) : options.fn;

			// Handle priorities using binary search.
			// Thank you, underscore.js! Inspired by _.sortedIndex.
			low = 0;
			high = this.callbacks.length;
			while ( low < high ) {
				mid = ( low + high ) >> 1; // Bit shift to divide by two.
				if ( this.callbacks[ mid ].priority <= options.priority )
					low = mid + 1;
				else
					high = mid;
			}

			this.callbacks.splice( low, 0, options );
			return this;
		},

		once: function( options ) {
			if ( ! options.fn )
				return;

			var callback = options.fn,
				self     = this;

			options.fn = function() {
				callback.apply( this, arguments );
				self.remove( options.fn );
			};

			return this.add( options );
		},

		_filter: function( options, reject ) {
			options = options || {};
			return _[ reject ? 'reject' : 'filter' ]( this.callbacks, function( callback ) {
				return _.all( options, function( value, key ) {
					if ( 'namespace' === key ) {
						return _.all( value, function( v, ns ) {
							return callback.namespace[ ns ];
						});
					} else {
						return value === callback[ key ];
					}
				});
			}, this );
		},

		_reject: function( options ) {
			return this._filter( options, true );
		},

		remove: function( options ) {
			this.callbacks = this._reject( options );
			return this;
		},

		// trigger( [filter], [iterator], [args] )
		trigger: function( a, b, c ) {
			var params = {};

			// trigger( args )
			if ( _.isArray( a ) ) {
				params.args = a;

			// trigger( iterator, [args] )
			} else if ( _.isFunction( a ) || _.isString( a ) ) {
				params.iterator = a;
				params.args = b;

			// trigger( filter, args )
			} else if ( _.isArray( b ) ) {
				params.filter = a;
				params.args = b;

			// trigger( filter, [iterator, [args]] )
			} else {
				params.filter = a;
				params.iterator = b;
				params.args = c;
			}

			return this.run( params );
		},

		/**
		 * Runs the event.
		 * Low level, flexible method.
		 *
		 * @param {object}   params     Optional. The parameters used to run the event.
		 *
		 *        {array}    args       Optional. The arguments to execute the callback with.
		 *
		 *        {mixed}    iterator   Optional. The function that runs the callbacks.
		 *                              Can be a function or a string that corresponds to a function bound to 'this.iterators'.
		 *                              Defaults to 'this.iterators.each'.
		 *
		 *        {object}   context    Optional. The context in which to call the function (the 'this' keyword).
		 *                              This will not effect callbacks that have already been bound to a context.
		 *
		 *        {object}   filter     Optional. Properties used to filter the callbacks.
		 *                              Only callbacks that match this structure will be used.
		 *                              All properties are optional:
		 *        +   {object}   namespace  An object with namespace keys mapped to 'true'.
		 *        +   {function} fn         The callback function.
		 *        +   {object}   context    The context in which to call the function (the 'this' keyword).
		 *        +   {integer}  priority   The priority of the callback.
		 */
		run: function( params ) {
			params = params || {};

			// Iterator can either be a function, or a string that corresponds
			// to a registered iterator.
			if ( _.isString( params.iterator ) )
				params.iterator = this.iterators[ params.iterator ];

			// Fill in the defaults.
			_.defaults( params, {
				iterator: this.iterators.each,
				context:  this.context,
				filter:   {},
				args:     []
			});

			// Filters the callbacks and prevents race conditions
			// by not directly referring to this.callbacks.
			// Then, pluck all of the bound callbacks so the iterator isn't
			// accessing the direct object.
			var callbacks = _.pluck( this._filter( params.filter ), 'bound' );

			return params.iterator.call( this, callbacks, params.args, params.context );
		},

		iterators: {
			each: function( callbacks, args, context ) {
				_.each( callbacks, function( callback ) {
					callback.apply( context, args );
				});
			},

			reduce: function( callbacks, args, context ) {
				return _.reduce( callbacks, function( memo, callback ) {
					return callback.apply( context, [ memo ].concat( args ) );
				}, args.shift() );
			},

			all: function( callbacks, args, context ) {
				return _.all( callbacks, function( callback ) {
					return !! callback.apply( context, args );
				});
			},

			any: function( callbacks, args, context ) {
				return _.any( callbacks, function( callback ) {
					return !! callback.apply( context, args );
				});
			}
		}
	});

	// Create aliases for 'action' and 'filter'
	_.extend( Event.prototype.iterators, {
		action: Event.prototype.iterators.each,
		filter: Event.prototype.iterators.reduce
	});


	/**
	 * EVENTS
	 */

	Events = function() {
		this.events = {};
	};

	_.extend( Events.prototype, {
		/**
		 * Processes event strings and automatically creates events.
		 *
		 * @param  {string}   events      A string that represents a series of events and namespaces.
		 *                                Events are separated by spaces. Namespaces are separated by dots.
		 * @param  {Function} iterator    The callback to iterate over the events with.
		 *                                Signature: iterator( event, options )
		 * @param  {object}   options     Options for the process method.
		 *         {boolean}  idRequired  Whether an id is required for each event.
		 */
		process: function( events, iterator, options ) {
			options = _.defaults( options || {}, {
				idRequired: true
			});

			var result = _( events.split(' ') ).chain().map( function( value, key ) {
				var namespaces = value.split('.'),
					params = {
						id: namespaces.shift(),
						namespace: {}
					};

				_.each( namespaces, function( key ) {
					params.namespace[ key ] = true;
				});

				// If we have an ID, everything is normal.
				if ( params.id )
					return params;

				// If no ID is supplied, we either ignore this event
				// or apply the params to every event.
				if ( options.idRequired || ! namespaces.length ) {
					return false;
				} else {
					return _.map( this.events, function( event ) {
						return _.extend( {}, params, { id: event.id } );
					});
				}
			}, this ).flatten().compact().map( function( params ) {
				if ( ! this.events[ params.id ] )
					this.events[ params.id ] = new Event({ id: params.id });
				return iterator.call( this, this.events[ params.id ], { namespace: params.namespace } );
			}, this ).value();

			// If only one event was provided, return the result.
			// Otherwise, return an array of results.
			return ( 1 === result.length ) ? result[0] : result;
		},

		// _on( method, events, callback, [context], [priority] )
		_on: function( method, events, fn, context, priority ) {
			// Handle when context is not set, but priority is.
			if ( _.isNumber( context ) ) {
				priority = context;
				context = null;
			}

			var callback = {
				fn: fn,
				context: context,
				priority: priority
			};

			this.process( events, function( event, options ) {
				event[ method ]( _.extend( options, callback ) );
			});
		},

		// on( events, callback, [context], [priority] )
		on: function( events, fn, context, priority ) {
			this._on( 'add', events, fn, context, priority );
		},

		// once( events, callback, [context], [priority] )
		once: function( events, fn, context, priority ) {
			this._on( 'once', events, fn, context, priority );
		},

		off: function( events, fn ) {
			this.process( events, function( event, options ) {
				if ( fn )
					options.fn = fn;
				event.remove( options );
			}, { idRequired: false });
		},

		// trigger( events, [iterator], [args] )
		trigger: function( events, iterator, args ) {
			return this.process( events, function( event, options ) {
				return event.trigger( options, iterator, args );
			});
		}
	});

	// Create shortcuts for default iterators
	_.each( Event.prototype.iterators, function( iterator, method ) {

		// Don't overwrite existing methods
		if ( Events.prototype[ method ] )
			return;

		// iteratorName( events, args* )
		Events.prototype[ method ] = function( events ) {
			return this.trigger( events, method, _.rest( arguments ) );
		};
	});

	// Share Event and Events with the world.
	exports.Event  = Event;
	exports.Events = Events;

	/**
	 * GLOBAL EVENT LOOP
	 */
	exports.events = new Events();

	// Bind all functions of the global event loop to the exports.events object.
	_.bindAll( exports.events );

	exports.addAction    = exports.events.on;
	exports.addFilter    = exports.events.on;
	exports.removeAction = exports.events.off;
	exports.removeFilter = exports.events.off;
	exports.doAction     = exports.events.action;
	exports.applyFilters = exports.events.filter;

}( wp, _ ) );
