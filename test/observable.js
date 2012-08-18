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

	module( 'Observable', {
		setup: function() {
			this.ob = new exports.Observable();
		}
	});

	test( 'observable sets value', 1, function() {
		this.ob.set( 'test' );
		equal( this.ob.get(), 'test' );
	});

	test( 'observable is observable', 1, function() {
		this.ob.on( 'change', function() {
			ok( true, 'observer triggered' );
		});
		this.ob.set( 'test' );
	});

	test( 'pull operates correctly', 1, function() {
		var slave = new exports.Observable();

		slave.pull( this.ob );
		this.ob.set( 'test' );

		equal( slave.get(), 'test' );
	});

	test( 'unpull operates correctly', 1, function() {
		var slave = new exports.Observable();

		slave.pull( this.ob );
		slave.unpull( this.ob );
		this.ob.set( 'test' );

		equal( slave.get(), undefined );
	});

	test( 'sync operates correctly', 4, function() {
		var partner = new exports.Observable();

		partner.sync( this.ob );
		this.ob.set( 1 );

		strictEqual( partner.get(), 1 );
		strictEqual( this.ob.get(), 1 );

		partner.set( 2 );
		strictEqual( partner.get(), 2 );
		strictEqual( this.ob.get(), 2 );
	});

	test( 'unsync operates correctly', 6, function() {
		var partner = new exports.Observable();

		partner.sync( this.ob );
		this.ob.set( 1 );

		strictEqual( partner.get(), 1 );
		strictEqual( this.ob.get(), 1 );

		partner.set( 2 );
		strictEqual( partner.get(), 2 );
		strictEqual( this.ob.get(), 2 );

		partner.unsync( this.ob );
		partner.set( 3 );
		strictEqual( partner.get(), 3 );
		strictEqual( this.ob.get(), 2 );
	});

}( wp, _, jQuery ));
