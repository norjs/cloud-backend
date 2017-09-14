const assert = require('assert');
const debug = require('nor-debug');
const GenericParser = require('../dist/lib/GenericParser.js').default;

describe('GenericParser', () => {

	describe('#eatWhite()', () => {
		it('can eat whitespace', () => {
			const parser = new GenericParser('   hello world');
			parser.eatWhite();
			debug.assert(parser.getValue()).equals('hello world');
		});
	});

	describe('#eatString()', () => {

		it('can eat a string', () => {
			const parser = new GenericParser('hello world');
			parser.eatString('hello ');
			debug.assert(parser.getValue()).equals('world');
		});

		it('cannot eat diferent string', () => {
			const parser = new GenericParser('hello world');

			assert.throws(
				() => parser.eatString('world '),
				err => (err instanceof Error) && /Failed to parse at/.test(err),
				"unexpected error"
			);

			debug.assert(parser.getValue()).equals('hello world');
		});

	});

});