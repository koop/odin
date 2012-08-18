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

	module( 'Properties', {
		setup: function() {
			this.props = new exports.Properties();
		}
	});

	test( 'props.add() / props.observable() / props.remove()', function() {
		var a;

		this.props.add( 'a' );
		a = this.props.observable( 'a' );
		ok( a && a instanceof exports.Observable, 'observable successfully added and retrieved' );

		this.props.remove( 'a' );
		a = this.props.observable( 'a' );
		ok( !a, 'observable successfully removed' );
	});

	test( 'props.set() / props.get()', function() {
		this.props.set( 'a', 'works' );
		strictEqual( this.props.get('a'), 'works' );
	});

	test( 'properties are observable', function() {
		expect( 7 );

		var a, props = this.props;

		props.on( 'change:a', function( to, from ) {
			ok( true, 'callbacks can be bound before a property has been added' );
		});

		props.set( 'a', 'works' );
		props.off( 'change:a' );

		props.on( 'change:a' );
		props.on( 'change:a', function( to, from ) {
			ok( true, 'callback can be bound after a property has been added' );
			strictEqual( to, 'changed', '"to" value correct' );
			strictEqual( from, 'works', '"from" value correct' );
		});
		props.set( 'a', 'changed' );

		a = props.observable( 'a' );
		a.on( 'change', function() {
			ok( ! props.observable( 'a' ), 'property successfully removed' );
			ok( true, 'after remove(), callbacks bound directly to the observable remain unchanged' );
			ok( true, 'after remove(), callbacks bound to the properties object should not fire' );
		});

		props.remove( 'a' );
		a.set( 'removed' );
	});

	test( 'props.pull() / props.unpull()', 6, function() {
		this.props.add( 'master' );
		this.props.add( 'slave' );

		this.props.pull( 'slave', 'master' );
		this.props.set( 'master', 'pulled' );

		strictEqual( this.props.get( 'master' ), 'pulled', 'master updated' );
		strictEqual( this.props.get( 'slave' ),  'pulled', 'slave updated when master updated' );

		this.props.set( 'slave', 'freedom' );

		strictEqual( this.props.get( 'master' ), 'pulled',  'master unchanged when slave updated' );
		strictEqual( this.props.get( 'slave' ),  'freedom', 'slave updated' );

		this.props.unpull( 'slave', 'master' );
		this.props.set( 'master', 'changed' );

		strictEqual( this.props.get( 'master' ), 'changed', 'unpull() successful' );
		strictEqual( this.props.get( 'slave' ),  'freedom', 'unpull() successful' );
	});

	test( 'props.sync() / props.unsync()', 6, function() {
		this.props.add( 'yin' );
		this.props.add( 'yang' );

		this.props.sync( 'yin', 'yang' );
		this.props.set( 'yin', 5 );
		strictEqual( this.props.get( 'yin' ),  5, 'synchronized when first value is set' );
		strictEqual( this.props.get( 'yang' ), 5, 'synchronized when first value is set' );

		this.props.set( 'yang', 'balance' );
		strictEqual( this.props.get( 'yin' ),  'balance', 'synchronized when second value is set' );
		strictEqual( this.props.get( 'yang' ), 'balance', 'synchronized when second value is set' );

		this.props.unsync( 'yin', 'yang' );
		this.props.set( 'yin', 2 );
		this.props.set( 'yang', 3 );
		strictEqual( this.props.get( 'yin' ),  2, 'unsync() successful' );
		strictEqual( this.props.get( 'yang' ), 3, 'unsync() successful' );
	});

}( wp, _, jQuery ));
