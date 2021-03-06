/*global QUnit:false, module:false, test:false, asyncTest:false, expect:false*/
/*global start:false, stop:false ok:false, equal:false, notEqual:false, deepEqual:false*/
/*global notDeepEqual:false, strictEqual:false, notStrictEqual:false, raises:false*/
(function( exports, _, $ ) {

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

	var Event = exports.Event,
		Events = exports.Events;

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

	test( 'namespaces', function() {
		var watching, record, recordTrigger, recordOff;

		// Announce what we're watching.
		watching = [ 'a', 'a.x', 'a.y', 'a.x.y', 'a.y.x', 'b', 'b.x', 'b.y', 'b.x.y', 'b.y.x' ];
		ok( true, 'Watching [ ' + watching.join(', ') + ' ]' );

		record = function( expected, callback ) {
			var events    = new Events(),
				triggered = [],
				message;

			// Register the various events to watch.
			_.each( watching, function( event ) {
				events.on( event, function() { triggered.push( event ); });
			}, this );

			expected  = _.uniq( expected ).sort();
			message = callback.apply( events );

			// Order-insensitive.
			deepEqual( _.uniq( triggered ).sort(), expected, message + ' and recorded [ ' + expected.join(', ')  + ' ]' );
		};

		recordTrigger = function( event, expected ) {
			record( expected, function() {
				this.trigger( event );
				return 'Triggered "' + event + '"';
			});
		};

		recordOff = function( remove, trigger, expected ) {
			record( expected, function() {
				this.off( remove );
				this.trigger( trigger );
				return 'Removed "' + remove + '", triggered "' + trigger + '"';
			});
		};

		// Trigger various combinations of namespaces.
		recordTrigger( 'a',     ['a','a.x','a.y','a.x.y','a.y.x'] );
		recordTrigger( 'a.x',   ['a.x','a.x.y','a.y.x'] );
		recordTrigger( 'a.x.y', ['a.x.y','a.y.x'] );
		recordTrigger( '.x',    [] );
		recordTrigger( '',      [] );

		// Remove various combinations of namespaces, then trigger an event.
		recordOff( 'a',        'a', [] );
		recordOff( 'a.x',      'a', ['a','a.y'] );
		recordOff( 'a.x.y',    'a', ['a','a.x','a.y'] );
		recordOff( 'a.none',   'a', ['a','a.x','a.y','a.x.y','a.y.x'] );
		recordOff( 'a.x.none', 'a', ['a','a.x','a.y','a.x.y','a.y.x'] );

		recordOff( '.x', 'a b', ['a','a.y','b','b.y'] );
		// Removing the empty string should leave everything intact.
		recordOff( '',   'a b', ['a','a.x','a.y','a.x.y','a.y.x','b','b.x','b.y','b.x.y','b.y.x'] );

	});

	test( 'implicit priority triggers in the correct order', function() {
		var triggered = [];
		_.each( _.range( 1, 6 ), function( index ) {
			this.events.on( 'a', function() {
				triggered.push( index );
			});
		}, this );

		this.events.trigger( 'a' );
		deepEqual( triggered, _.range( 1, 6 ), 'implicit priorities correct' );
	});

	test( 'explicit priority', function() {
		var watching, record,
			// Creates an event name based on a priority.
			priorityEvent = function( priority ) {
				var event = [ 'count', priority ];

				// Generate namespaces for odd, even, and multiples of three.
				event.push( priority % 2 ? 'odd' : 'even' );
				if ( 0 === (priority % 3) )
					event.push('three');

				return event.join('.');
			};

		// Announce what we're watching.
		watching = [ 6, 2, 1, 4, 5, 3 ];
		ok( true, 'Watching [ ' + watching.join(', ') + ' ]' );

		record = function( trigger, priorities ) {
			var events    = new Events(),
				triggered = [],
				expected;

			// Register the various events to watch.
			_.each([ 6, 2, 1, 4, 5, 3 ], function( priority ) {
				var event = priorityEvent( priority );
				events.on( event, function() { triggered.push( event ); }, priority );
			}, this );

			expected = _.map( priorities, priorityEvent );
			events.trigger( trigger );

			// Order-sensitive.
			deepEqual( triggered, expected, 'Triggered "' + trigger + '" and recorded [ ' + priorities.join(', ')  + ' ]' );
		};

		record( 'count', [ 1, 2, 3, 4, 5, 6 ] );
		record( 'count.odd', [ 1, 3, 5 ] );
		record( 'count.even', [ 2, 4, 6 ] );
		record( 'count.three', [ 3, 6 ] );
	});

	test( 'reduce()', function() {
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

		strictEqual( this.events.reduce( 'gamut', 0 ), 30, 'reduce successful' );
	});

	test( 'context', function() {
		var event = new Event(),
			context = {}, callback = {};

		_.each({
			all: 'change the context of all unbound callbacks',
			explicit: 'change the callback for a single call',
			bound: 'bound callbacks always use their originally bound context'
		}, function( message, type ) {
			context[ type ]  = { context: type };
			callback[ type ] = function() {
				strictEqual( this.context, type, message );
			};
		});

		callback.standard = function() {
			strictEqual( this, event, 'event uses itself as context by default' );
		};

		// Add bound callback before everything else.
		event.add({ fn: callback.bound, context: context.bound });

		event.add({ fn: callback.standard });
		event.run();
		event.remove({ fn: callback.standard });

		event.context = context.all;
		event.add({ fn: callback.all });
		event.run();
		event.remove({ fn: callback.all });

		event.add({ fn: callback.explicit  });
		event.run({ context: context.explicit });
		event.remove({ fn: callback.explicit });
	});

	test( 'addAction / doActions / removeAction', 3, function() {
		exports.addAction( 'a', function() {
			ok( true, 'triggered action "a"' );
		});
		equal( exports.events.events.a.callbacks.length, 1, 'added action "a"' );
		exports.doAction( 'a' );
		exports.removeAction( 'a' );
		equal( exports.events.events.a.callbacks.length, 0, 'removed action "a"' );
	});

	test( 'addFilter / applyFilters / removeFilter', 4, function() {
		exports.addFilter( 'a', function( value ) {
			strictEqual( value, 5, 'triggered filter "a"' );
			return 20;
		});
		equal( exports.events.events.a.callbacks.length, 1, 'added filter "a"' );

		var result = exports.applyFilters( 'a', 5 );
		strictEqual( result, 20, 'correct result for filter "a"' );

		exports.removeFilter( 'a' );
		equal( exports.events.events.a.callbacks.length, 0, 'removed filter "a"' );
	});

}( Odin, _, jQuery ));
