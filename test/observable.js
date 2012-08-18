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

	test( 'observable.set() / observable.get()', 1, function() {
		this.ob.set( 'test' );
		equal( this.ob.get(), 'test' );
	});

	test( 'observable is observable', 1, function() {
		this.ob.on( 'change', function() {
			ok( true, 'observer triggered' );
		});
		this.ob.set( 'test' );
	});
	test( 'observable.pull() / observable.unpull()', 6, function() {
		var slave = new exports.Observable();

		slave.pull( this.ob );
		this.ob.set( 'test' );
		strictEqual( this.ob.get(), 'test', 'master updated' );
		strictEqual( slave.get(),   'test', 'slave updated when master updated' );

		slave.set( 'freedom' );
		strictEqual( this.ob.get(), 'test',    'master unchanged when slave updated' );
		strictEqual( slave.get(),   'freedom', 'slave updated' );

		slave.unpull( this.ob );
		this.ob.set( 'changed' );
		strictEqual( this.ob.get(), 'changed', 'unpull() successful' );
		strictEqual( slave.get(),   'freedom', 'unpull() successful' );
	});

	test( 'observable.sync() / observable.unsync()', 6, function() {
		var partner = new exports.Observable();

		partner.sync( this.ob );
		this.ob.set( 1 );

		strictEqual( partner.get(), 1, 'synchronized when first value is set' );
		strictEqual( this.ob.get(), 1, 'synchronized when first value is set' );

		partner.set( 2 );
		strictEqual( partner.get(), 2, 'synchronized when second value is set' );
		strictEqual( this.ob.get(), 2, 'synchronized when second value is set' );

		partner.unsync( this.ob );
		partner.set( 3 );
		strictEqual( partner.get(), 3, 'unpull() successful' );
		strictEqual( this.ob.get(), 2, 'unsync() successful' );
	});

}( wp, _, jQuery ));
