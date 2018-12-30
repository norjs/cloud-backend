import 'babel-polyfill';
import assert from 'assert';
import debug from '@norjs/debug';
import ParseError from '../src/lib/ParseError.js';
import GenericParser from '../src/lib/GenericParser.js';

describe('GenericParser', () => {

	describe('#eatWhite()', () => {

		it('can eat whitespace', () => {
			const parser = new GenericParser('   hello world');
			parser.eatWhite();
			debug.assert(parser.getValue()).equals('hello world');
		});

		it('cannot eat non-whitespace', () => {
			const parser = new GenericParser('hello world');
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

		it('cannot eat different string', () => {
			const parser = new GenericParser('hello world');

			assert.throws(
				() => parser.eatString('world '),
				ParseError,
				"ParseError: Near \"hello world\""
			);

			debug.assert(parser.getValue()).equals('hello world');
		});

	});

	describe('#isEmpty()', () => {

		it('can detect empty', () => {
			const parser = new GenericParser('');
			debug.assert(parser.isEmpty()).equals(true);
		});

		it('can detect non empty', () => {
			const parser = new GenericParser('abcd');
			debug.assert(parser.isEmpty()).equals(false);
		});

	});

	describe('#notEmpty()', () => {

		it('can detect empty', () => {
			const parser = new GenericParser('');
			debug.assert(parser.notEmpty()).equals(false);
		});

		it('can detect non empty', () => {
			const parser = new GenericParser('abcd');
			debug.assert(parser.notEmpty()).equals(true);
		});

	});

	describe('#isBoundary()', () => {

		it('can detect empty', () => {
			const parser = new GenericParser('');
			debug.assert(parser.isBoundary()).equals(true);
		});

		it('can detect space', () => {
			const parser = new GenericParser(' world');
			debug.assert(parser.isBoundary()).equals(true);
		});

		it('can detect non-border', () => {
			const parser = new GenericParser('hello world');
			debug.assert(parser.isBoundary()).equals(false);
		});

		it('can detect user-defined boundary', () => {
			const parser = new GenericParser('.world');

			debug.assert(parser.isBoundary()).equals(false);

			const myBoundaryTest = () => parser.startsWith('.');

			parser.setBoundary(myBoundaryTest);
			debug.assert(parser.isBoundary()).equals(true);

			parser.unsetBoundary(myBoundaryTest);
			debug.assert(parser.isBoundary()).equals(false);

		});

	});

	describe('#notBoundary()', () => {

		it('can detect empty', () => {
			const parser = new GenericParser('');
			debug.assert(parser.notBoundary()).equals(false);
		});

		it('can detect space', () => {
			const parser = new GenericParser(' world');
			debug.assert(parser.notBoundary()).equals(false);
		});

		it('can detect non-border', () => {
			const parser = new GenericParser('hello world');
			debug.assert(parser.notBoundary()).equals(true);
		});

	});

	describe('#startsWith()', () => {

		it('can detect string', () => {
			const parser = new GenericParser('hello world');
			debug.assert(parser.startsWith('hello')).equals(true);
		});

		it('cannot detect string', () => {
			const parser = new GenericParser('hello world');
			debug.assert(parser.startsWith('world')).equals(false);
		});

		it('cannot detect from empty string', () => {
			const parser = new GenericParser('');
			debug.assert(parser.startsWith('world')).equals(false);
		});

	});

	describe('#startsWithWord()', () => {

		it('can detect word', () => {
			const parser = new GenericParser('hello world');
			debug.assert(parser.startsWithWord('hello')).equals(true);
		});

		it('cannot detect word without whitespace', () => {
			const parser = new GenericParser('helloworld');
			debug.assert(parser.startsWithWord('hello')).equals(false);
		});

		it('cannot detect wrong word', () => {
			const parser = new GenericParser('hello world');
			debug.assert(parser.startsWithWord('world')).equals(false);
		});

		it('cannot detect from empty string', () => {
			const parser = new GenericParser('');
			debug.assert(parser.startsWithWord('world')).equals(false);
		});

	});

	describe('#startsWithDigit()', () => {

		it('can detect digit', () => {
			const parser = new GenericParser('123 hello world');
			debug.assert(parser.startsWithDigit()).equals(true);
		});

		it('cannot detect non-digit', () => {
			const parser = new GenericParser('hello world');
			debug.assert(parser.startsWithDigit()).equals(false);
		});

		it('cannot detect from empty string', () => {
			const parser = new GenericParser('');
			debug.assert(parser.startsWithDigit()).equals(false);
		});

	});

	describe('#startsWithAlpha()', () => {

		it('can detect alpha', () => {
			const parser = new GenericParser('hello world');
			debug.assert(parser.startsWithAlpha()).equals(true);
		});

		it('can detect uppercase alpha', () => {
			const parser = new GenericParser('Hello world');
			debug.assert(parser.startsWithAlpha()).equals(true);
		});

		it('cannot detect digit', () => {
			const parser = new GenericParser('123 hello world');
			debug.assert(parser.startsWithAlpha()).equals(false);
		});

		it('cannot detect from empty string', () => {
			const parser = new GenericParser('');
			debug.assert(parser.startsWithAlpha()).equals(false);
		});

	});

	describe('#startsWithWhite()', () => {

		it('can detect whitespace', () => {
			const parser = new GenericParser(' hello world');
			debug.assert(parser.startsWithWhite()).equals(true);
		});

		it('cannot detect alpha', () => {
			const parser = new GenericParser('hello world');
			debug.assert(parser.startsWithWhite()).equals(false);
		});

		it('cannot detect digit', () => {
			const parser = new GenericParser('123 hello world');
			debug.assert(parser.startsWithWhite()).equals(false);
		});

		it('cannot detect from empty string', () => {
			const parser = new GenericParser('');
			debug.assert(parser.startsWithWhite()).equals(false);
		});

	});

	describe('#notStartsWithWhite()', () => {

		it('cannot detect whitespace', () => {
			const parser = new GenericParser(' hello world');
			debug.assert(parser.notStartsWithWhite()).equals(false);
		});

		it('can detect alpha', () => {
			const parser = new GenericParser('hello world');
			debug.assert(parser.notStartsWithWhite()).equals(true);
		});

		it('can detect digit', () => {
			const parser = new GenericParser('123 hello world');
			debug.assert(parser.notStartsWithWhite()).equals(true);
		});

		it('can detect from empty string', () => {
			const parser = new GenericParser('');
			debug.assert(parser.notStartsWithWhite()).equals(true);
		});

	});

	describe('#throwParseError()', () => {

		it('can throw ParseError', () => {
			const parser = new GenericParser('');
			assert.throws(() => parser.throwParseError(), ParseError, "Failed to parse at");
		});

	});

	describe('#parseAmount()', () => {

		it('can parse data from longer', () => {
			const parser = new GenericParser('hello world');
			debug.assert(parser.parseAmount(5)).equals('hello');
		});

		it('can parse data from equal', () => {
			const parser = new GenericParser('hello');
			debug.assert(parser.parseAmount(5)).equals('hello');
		});

		it('cannot parse too short string', () => {
			const parser = new GenericParser('hi');
			assert.throws(() => parser.parseAmount(5), ParseError, "Failed to parse at hi");
		});

	});

});