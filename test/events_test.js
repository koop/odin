/*global QUnit:false, module:false, test:false, asyncTest:false, expect:false*/
/*global start:false, stop:false ok:false, equal:false, notEqual:false, deepEqual:false*/
/*global notDeepEqual:false, strictEqual:false, notStrictEqual:false, raises:false*/
(function($) {

	/*
		======== A Handy Little QUnit Reference ========
		http://docs.jquery.com/QUnit

		Test methods:
			expect(numAssertions)
			stop(increment)
			start(decrement)
		Test assertions:
			ok(value, [message])
			equal(actual, expected, [message])
			notEqual(actual, expected, [message])
			deepEqual(actual, expected, [message])
			notDeepEqual(actual, expected, [message])
			strictEqual(actual, expected, [message])
			notStrictEqual(actual, expected, [message])
			raises(block, [expected], [message])
	*/

	var Event = wp.Event,
		Events = wp.Events;

	module( 'Events', {
		setup: function() {
			this.events = new Events();
		}
	});

	test( 'add / trigger / remove an event', 3, function() {
		this.events.on( 'a', function() {
			ok( true, 'triggered event "a"' );
		});
		equal( this.events.events.a.callbacks.length, 1, 'added event "a"' );
		this.events.trigger( 'a' );
		this.events.off( 'a' );
		equal( this.events.events.a.callbacks.length, 0, 'removed event "a"' );
	});

	test( 'add / trigger / remove multiple events', 6, function() {
		this.events.on( 'a b', function() {
			ok( true, 'triggered event "a" or "b"' );
		});
		equal( this.events.events.a.callbacks.length, 1, 'added event "a"' );
		equal( this.events.events.b.callbacks.length, 1, 'added event "b"' );

		this.events.trigger( 'a b' );

		this.events.off( 'a b' );
		equal( this.events.events.a.callbacks.length, 0, 'removed event "a"' );
		equal( this.events.events.b.callbacks.length, 0, 'removed event "a"' );
	});

	test( 'once', 3, function() {
		this.events.once( 'a', function() {
			ok( true, 'triggered event "a"' );
		});
		equal( this.events.events.a.callbacks.length, 1, 'added event "a"' );
		this.events.trigger( 'a' ); // Should assert 'triggered event "a"'
		equal( this.events.events.a.callbacks.length, 0, 'automatically removed event "a"' );
		this.events.trigger( 'a' ); // Nothing should happen.
	});

	test( 'once, multiple', 6, function() {
		this.events.once( 'a b', function() {
			ok( true, 'triggered event "a" or "b"' );
		});
		equal( this.events.events.a.callbacks.length, 1, 'added event "a"' );
		this.events.trigger( 'a' ); // Should assert 'triggered event "a" or "b"'
		equal( this.events.events.a.callbacks.length, 0, 'automatically removed event "a"' );
		this.events.trigger( 'a' ); // Nothing should happen.

		equal( this.events.events.b.callbacks.length, 1, 'event "b" still bound' );
		this.events.trigger( 'b' ); // Should assert 'triggered event "a" or "b"'
		equal( this.events.events.b.callbacks.length, 0, 'automatically removed event "b"' );
		this.events.trigger( 'b' ); // Nothing should happen.
	});

	module( 'Namespaces', {
		setup: function() {
			this.events = new Events();

			var triggered = [];

			this.events.record = function( events ) {
				_.each( events, function( event ) {
					this.on( event, function() { triggered.push( event ); });
				}, this );
			};

			// Order-insensitive
			this.events.recorded = function( events ) {
				events = _.uniq( events ).sort();
				deepEqual( _.uniq( triggered ).sort(), events, 'recorded: ' + events.join(', ') );
			};

			this.events.record([ 'a', 'a.x', 'a.y', 'a.x.y', 'a.y.x', 'b', 'b.x', 'b.y', 'b.x.y', 'b.y.x' ]);
		}
	});

	test( 'trigger event "a"', 1, function() {
		this.events.trigger( 'a' );
		this.events.recorded(['a','a.x','a.y','a.x.y','a.y.x']);
	});

	test( 'trigger event "a.x"', 1, function() {
		this.events.trigger( 'a.x' );
		this.events.recorded(['a.x','a.x.y','a.y.x']);
	});

	test( 'trigger event "a.x.y"', 1, function() {
		this.events.trigger( 'a.x.y' );
		this.events.recorded(['a.x.y','a.y.x']);
	});

	test( 'trigger event ".x"', 1, function() {
		this.events.trigger( '.x' );
		this.events.recorded([]);
	});

	test( 'remove "a"', 1, function() {
		this.events.off( 'a' );
		this.events.trigger( 'a' );
		this.events.recorded([]);
	});

	test( 'remove "a.x"', 1, function() {
		this.events.off( 'a.x' );
		this.events.trigger( 'a' );
		this.events.recorded(['a','a.y']);
	});

	test( 'remove "a.x.y"', 1, function() {
		this.events.off( 'a.x.y' );
		this.events.trigger( 'a' );
		this.events.recorded(['a','a.x','a.y']);
	});

	test( 'remove "a.none"', 1, function() {
		this.events.off( 'a.none' );
		this.events.trigger( 'a' );
		this.events.recorded(['a','a.x','a.y','a.x.y','a.y.x']);
	});

	test( 'remove "a.x.none"', 1, function() {
		this.events.off( 'a.x.none' );
		this.events.trigger( 'a' );
		this.events.recorded(['a','a.x','a.y','a.x.y','a.y.x']);
	});

	test( 'remove ".x"', 1, function() {
		this.events.off( '.x' );
		this.events.trigger( 'a' );
		this.events.trigger( 'b' );
		this.events.recorded(['a','a.y','b','b.y']);
	});

	// Removing the empty string should leave everything intact.
	test( 'remove ""', 1, function() {
		this.events.off( '' );
		this.events.trigger( 'a' );
		this.events.trigger( 'b' );
		this.events.recorded(['a','a.x','a.y','a.x.y','a.y.x','b','b.x','b.y','b.x.y','b.y.x']);
	});

	module( 'Priority – Implicit', {
		setup: function() {
			this.events = new Events();
		}
	});

	test( 'trigger', function() {
		var triggered = [];
		_.each( _.range( 1, 6 ), function( index ) {
			this.events.on( 'a', function() {
				triggered.push( index );
			});
		}, this );

		this.events.trigger( 'a' );
		deepEqual( triggered, _.range( 1, 6 ), 'implicit priorities correct' );
	});

	module( 'Priority – Explicit', {
		setup: function() {
			this.events = new Events();

			var triggered = [],
				// Generate event based on priorty names.
				priorityEvent = function( priority ) {
					var event = [ 'count', priority ];

					// Generate namespaces for odd, even, and multiples of three.
					event.push( priority % 2 ? 'odd' : 'even' );
					if ( 0 === (priority % 3) )
						event.push('three');

					return event.join('.');
				};

			// Add out of order
			_.each([ 6, 2, 1, 4, 5, 3 ], function( priority ) {
				var event = priorityEvent( priority );
				this.events.on( event, function() { triggered.push( event ); }, priority );
			}, this );

			// Order-sensitive
			this.events.recorded = function( priorities ) {
				var events = _.map( priorities, priorityEvent );
				deepEqual( triggered, events, 'recorded: ' + events.join(', ') );
			};
		}
	});

	test( 'trigger "count"', 1, function() {
		this.events.trigger( 'count' );
		this.events.recorded([ 1, 2, 3, 4, 5, 6 ]);
	});

	test( 'trigger "count.odd"', 1, function() {
		this.events.trigger( 'count.odd' );
		this.events.recorded([ 1, 3, 5 ]);
	});

	test( 'trigger "count.even"', 1, function() {
		this.events.trigger( 'count.even' );
		this.events.recorded([ 2, 4, 6 ]);
	});

	test( 'trigger "count.three"', 1, function() {
		this.events.trigger( 'count.three' );
		this.events.recorded([ 3, 6 ]);
	});

	module( 'Trigger – Reduce', {
		setup: function() {
			this.events = new Events();
			this.events.reduce = function( events, args ) {
				return this.trigger.call( this, events, 'reduce', args );
			};
		}
	});

	test( 'reduce various values', function() {
		this.events.on( 'gamut', function( value ) {
			strictEqual( value, 0 );
			return true;
		});

		this.events.on( 'gamut', function( value ) {
			strictEqual( value, true );
			return { x: 20 };
		});

		this.events.on( 'gamut', function( value ) {
			deepEqual( value, { x: 20 } );
			value.y = 10;
			return value;
		});

		this.events.on( 'gamut', function( value ) {
			deepEqual( value, { x: 20, y: 10 } );
			return value.x + value.y;
		});

		strictEqual( this.events.reduce( 'gamut', [ 0 ] ), 30, 'reduce successful' );
	});

}(jQuery));
