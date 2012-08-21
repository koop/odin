/*
 * odin
 * https://github.com/koop/odin
 *
 * Copyright (c) 2012 Daryl Koopersmith
 * Licensed under the GPL license, version 2 or greater.
 */

(function( _, $ ){
	var Odin,
		root = this,
		_Odin = root.Odin;

	if ( typeof exports !== 'undefined' ) {
		Odin = exports;
	} else {
		Odin = root.Odin = {};
	}

	Odin.noConflict = function() {
		root.Odin = _Odin;
		return Odin;
	};

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

	Events = function( options ) {
		_.extend( this, options );
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

		// run( events, params )
		run: function( events, params ) {
			// Use the Events instance context if a context isn't specified.
			if ( this.context && ! params.context )
				params.context = this.context;

			return this.process( events, function( event, filter ) {
				return event.run( _.extend({ filter: filter }, params ) );
			});
		}
	});

	// Create shortcuts for default iterators
	_.chain({
		trigger: Event.prototype.iterators.each
	}).extend( Event.prototype.iterators ).each( function( iterator, method ) {
		// iteratorName( events, args* )
		// Don't overwrite existing methods
		Events.prototype[ method ] = Events.prototype[ method ] || function( events ) {
			return this.run( events, {
				iterator: method,
				args: _.rest( arguments )
			});
		};

		// iteratorNameWith( context, events, args* )
		var methodWith = method + 'With';
		// Don't overwrite existing methods
		Events.prototype[ methodWith ] = Events.prototype[ methodWith ] || function( context, events ) {
			return this.run( events, {
				context: context,
				iterator: method,
				args: _.rest( arguments, 2 )
			});
		};
	});

	Events.mixin = {
		events: function() {
			return this._events = this._events || new Events({ context: this });
		}
	};

	_.each(['on','off','once','trigger','triggerWith'], function( method ) {
		Events.mixin[ method ] = function() {
			var events = this.events();
			return events[ method ].apply( events, arguments );
		};
	});

	// Share Event and Events with the world.
	Odin.Event  = Event;
	Odin.Events = Events;

	/**
	 * GLOBAL EVENT LOOP
	 */
	Odin.events = new Events();

	// Bind all functions of the global event loop to the Odin.events object.
	_.bindAll( Odin.events );

	Odin.addAction    = Odin.events.on;
	Odin.addFilter    = Odin.events.on;
	Odin.removeAction = Odin.events.off;
	Odin.removeFilter = Odin.events.off;
	Odin.doAction     = Odin.events.action;
	Odin.applyFilters = Odin.events.filter;


	/**
	 * OBSERVABLE
	 */

	var Observable = function() {
		this.set.apply( this, arguments );
	};

	_.extend( Observable.prototype, Odin.Events.mixin, {
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
	Odin.Observable = Observable;

	/**
	 * PROPERTIES
	 */

	var Properties = function( properties ) {
		this.set( properties );
	};

	_.extend( Properties.prototype, Odin.Events.mixin, {
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
			observable = observable || new Odin.Observable();

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
	Odin.Properties = Properties;

}( _, jQuery ));