import 'babel-polyfill';
import assert from 'assert';
import debug from '@norjs/debug';
import PromptParser from '../src/lib/PromptParser.js';

describe('PromptParser', () => {

	describe('#parseArray()', () => {

		it('can parse array', () => {
			const parser = new PromptParser('[1,2,3]');
			const values = parser.parseArray();
			debug.assert(parser.getValue()).equals('');
			debug.assert(values).is('array').length(3);
			debug.assert(values[0]).equals(1);
			debug.assert(values[1]).equals(2);
			debug.assert(values[2]).equals(3);
		});

		it('can parse array with spaces', () => {
			const parser = new PromptParser('[1, 2, 3]');
			const values = parser.parseArray();
			debug.assert(parser.getValue()).equals('');
			debug.assert(values).is('array').length(3);
			debug.assert(values[0]).equals(1);
			debug.assert(values[1]).equals(2);
			debug.assert(values[2]).equals(3);
		});

		it('can parse array with more data', () => {
			const parser = new PromptParser('[1, 2, 3] [a, b, c]');
			const values = parser.parseArray();
			debug.assert(parser.getValue()).equals(' [a, b, c]');
			debug.assert(values).is('array').length(3);
			debug.assert(values[0]).equals(1);
			debug.assert(values[1]).equals(2);
			debug.assert(values[2]).equals(3);
		});

	});

	describe('#parseObject()', () => {

		it('can parse object', () => {
			const parser = new PromptParser('{a:1,b:2,c:3}');
			const obj = parser.parseObject();
			debug.assert(parser.getValue()).equals('');
			debug.assert(obj).is('object');
			debug.assert(obj.a).equals(1);
			debug.assert(obj.b).equals(2);
			debug.assert(obj.c).equals(3);
			debug.assert(Object.keys(obj)).is('array').length(3);
		});

		it('can parse object with more data', () => {
			const parser = new PromptParser('{a:1,b:2,c:3} [1, 2, 3]');
			const obj = parser.parseObject();
			debug.assert(parser.getValue()).equals(' [1, 2, 3]');
			debug.assert(obj).is('object');
			debug.assert(obj.a).equals(1);
			debug.assert(obj.b).equals(2);
			debug.assert(obj.c).equals(3);
			debug.assert(Object.keys(obj)).is('array').length(3);
		});

		it('can parse object with leeding white spaces and more data', () => {
			const parser = new PromptParser('   {a:1,b:2,c:3} [1, 2, 3]');
			const obj = parser.parseObject();
			debug.assert(parser.getValue()).equals(' [1, 2, 3]');
			debug.assert(obj).is('object');
			debug.assert(obj.a).equals(1);
			debug.assert(obj.b).equals(2);
			debug.assert(obj.c).equals(3);
			debug.assert(Object.keys(obj)).is('array').length(3);
		});

	});

	describe('#parseNull()', () => {

		it('can parse null', () => {
			const parser = new PromptParser('null');
			const obj = parser.parseNull();
			debug.assert(parser.getValue()).equals('');
			debug.assert(obj).is('null');
		});

		it('can parse null with more data', () => {
			const parser = new PromptParser('null undefined');
			const obj = parser.parseNull();
			debug.assert(parser.getValue()).equals(' undefined');
			debug.assert(obj).is('null');
		});

		it('can parse null with leading whitespace and more data', () => {
			const parser = new PromptParser('    null undefined');
			const obj = parser.parseNull();
			debug.assert(parser.getValue()).equals(' undefined');
			debug.assert(obj).is('null');
		});

	});

	describe('#parseTrue()', () => {

		it('can parse true', () => {
			const parser = new PromptParser('true');
			const obj = parser.parseTrue();
			debug.assert(parser.getValue()).equals('');
			debug.assert(obj).is('true');
		});

		it('can parse true with more data', () => {
			const parser = new PromptParser('true undefined');
			const obj = parser.parseTrue();
			debug.assert(parser.getValue()).equals(' undefined');
			debug.assert(obj).is('true');
		});

		it('can parse true with leading whitespace and more data', () => {
			const parser = new PromptParser('    true undefined');
			const obj = parser.parseTrue();
			debug.assert(parser.getValue()).equals(' undefined');
			debug.assert(obj).is('true');
		});

	});

	describe('#parseFalse()', () => {

		it('can parse false', () => {
			const parser = new PromptParser('false');
			const obj = parser.parseFalse();
			debug.assert(parser.getValue()).equals('');
			debug.assert(obj).is('false');
		});

		it('can parse false with more data', () => {
			const parser = new PromptParser('false undefined');
			const obj = parser.parseFalse();
			debug.assert(parser.getValue()).equals(' undefined');
			debug.assert(obj).is('false');
		});

		it('can parse false with leading whitespace and more data', () => {
			const parser = new PromptParser('    false undefined');
			const obj = parser.parseFalse();
			debug.assert(parser.getValue()).equals(' undefined');
			debug.assert(obj).is('false');
		});

	});

	describe('#parseUndefined()', () => {

		it('can parse undefined', () => {
			const parser = new PromptParser('undefined');
			const obj = parser.parseUndefined();
			debug.assert(parser.getValue()).equals('');
			debug.assert(obj).is('undefined');
		});

		it('can parse undefined with more data', () => {
			const parser = new PromptParser('undefined undefined');
			const obj = parser.parseUndefined();
			debug.assert(parser.getValue()).equals(' undefined');
			debug.assert(obj).is('undefined');
		});

		it('can parse undefined with leading whitespace and more data', () => {
			const parser = new PromptParser('    undefined undefined');
			const obj = parser.parseUndefined();
			debug.assert(parser.getValue()).equals(' undefined');
			debug.assert(obj).is('undefined');
		});

	});

	describe('#parseString()', () => {

		it('can parse a string without quotes', () => {
			const parser = new PromptParser('foobar');
			const obj = parser.parseString();
			debug.assert(parser.getValue()).equals('');
			debug.assert(obj).is('string').equals('foobar');
		});

		it('can parse a string without quotes with a space', () => {
			const parser = new PromptParser('foo bar');
			const obj = parser.parseString();
			debug.assert(parser.getValue()).equals(' bar');
			debug.assert(obj).is('string').equals('foo');
		});

		it('can parse a string with double quotes', () => {
			const parser = new PromptParser('"foo bar"');
			const obj = parser.parseString();
			debug.assert(parser.getValue()).equals('');
			debug.assert(obj).is('string').equals('foo bar');
		});

		it('can parse a string with double quotes, with more data', () => {
			const parser = new PromptParser('"foo bar" 1234');
			const obj = parser.parseString();
			debug.assert(parser.getValue()).equals(' 1234');
			debug.assert(obj).is('string').equals('foo bar');
		});

		it('can parse a string with single quotes', () => {
			const parser = new PromptParser("'foo bar'");
			const obj = parser.parseString();
			debug.assert(parser.getValue()).equals('');
			debug.assert(obj).is('string').equals('foo bar');
		});

		it('can parse a string with single quotes, with more data', () => {
			const parser = new PromptParser("'foo bar' 1234");
			const obj = parser.parseString();
			debug.assert(parser.getValue()).equals(' 1234');
			debug.assert(obj).is('string').equals('foo bar');
		});

	});

	describe('#parseNumber()', () => {

		it('can parse a number', () => {
			const parser = new PromptParser('123');
			const obj = parser.parseNumber();
			debug.assert(parser.getValue()).equals('');
			debug.assert(obj).is('number').equals(123);
		});

		it('can parse a number with more data', () => {
			const parser = new PromptParser('123 abcdefg');
			const obj = parser.parseNumber();
			debug.assert(parser.getValue()).equals(' abcdefg');
			debug.assert(obj).is('number').equals(123);
		});

		it('can parse a float number', () => {
			const parser = new PromptParser('123.123');
			const obj = parser.parseNumber();
			debug.assert(parser.getValue()).equals('');
			debug.assert(obj).is('number').equals(123.123);
		});

		it('can parse a negative float number', () => {
			const parser = new PromptParser('-123.123');
			const obj = parser.parseNumber();
			debug.assert(parser.getValue()).equals('');
			debug.assert(obj).is('number').equals(-123.123);
		});

		it('can parse a negative scientific float number', () => {
			const parser = new PromptParser('-123.123e10');
			const obj = parser.parseNumber();
			debug.assert(parser.getValue()).equals('');
			debug.assert(obj).is('number').equals(-123.123e10);
		});

		it('can parse a scientific float number', () => {
			const parser = new PromptParser('123.123e-10');
			const obj = parser.parseNumber();
			debug.assert(parser.getValue()).equals('');
			debug.assert(obj).is('number').equals(123.123e-10);
		});

	});

	describe('#parseValue()', () => {

		// Array

		it('can parse array', () => {
			const parser = new PromptParser('[1,2,3]');
			const values = parser.parseValue();
			debug.assert(parser.getValue()).equals('');
			debug.assert(values).is('array').length(3);
			debug.assert(values[0]).equals(1);
			debug.assert(values[1]).equals(2);
			debug.assert(values[2]).equals(3);
		});

		it('can parse array with spaces', () => {
			const parser = new PromptParser('[1, 2, 3]');
			const values = parser.parseValue();
			debug.assert(parser.getValue()).equals('');
			debug.assert(values).is('array').length(3);
			debug.assert(values[0]).equals(1);
			debug.assert(values[1]).equals(2);
			debug.assert(values[2]).equals(3);
		});

		it('can parse array with more data', () => {
			const parser = new PromptParser('[1, 2, 3] [a, b, c]');
			const values = parser.parseValue();
			debug.assert(parser.getValue()).equals(' [a, b, c]');
			debug.assert(values).is('array').length(3);
			debug.assert(values[0]).equals(1);
			debug.assert(values[1]).equals(2);
			debug.assert(values[2]).equals(3);
		});

		// Object

		it('can parse object', () => {
			const parser = new PromptParser('{a:1,b:2,c:3}');
			const obj = parser.parseValue();
			debug.assert(parser.getValue()).equals('');
			debug.assert(obj).is('object');
			debug.assert(obj.a).equals(1);
			debug.assert(obj.b).equals(2);
			debug.assert(obj.c).equals(3);
			debug.assert(Object.keys(obj)).is('array').length(3);
		});

		it('can parse object with more data', () => {
			const parser = new PromptParser('{a:1,b:2,c:3} [1, 2, 3]');
			const obj = parser.parseValue();
			debug.assert(parser.getValue()).equals(' [1, 2, 3]');
			debug.assert(obj).is('object');
			debug.assert(obj.a).equals(1);
			debug.assert(obj.b).equals(2);
			debug.assert(obj.c).equals(3);
			debug.assert(Object.keys(obj)).is('array').length(3);
		});

		it('can parse object with leeding white spaces and more data', () => {
			const parser = new PromptParser('   {a:1,b:2,c:3} [1, 2, 3]');
			const obj = parser.parseValue();
			debug.assert(parser.getValue()).equals(' [1, 2, 3]');
			debug.assert(obj).is('object');
			debug.assert(obj.a).equals(1);
			debug.assert(obj.b).equals(2);
			debug.assert(obj.c).equals(3);
			debug.assert(Object.keys(obj)).is('array').length(3);
		});

		// Null

		it('can parse null', () => {
			const parser = new PromptParser('null');
			const obj = parser.parseValue();
			debug.assert(parser.getValue()).equals('');
			debug.assert(obj).is('null');
		});

		it('can parse null with more data', () => {
			const parser = new PromptParser('null undefined');
			const obj = parser.parseValue();
			debug.assert(parser.getValue()).equals(' undefined');
			debug.assert(obj).is('null');
		});

		it('can parse null with leading whitespace and more data', () => {
			const parser = new PromptParser('    null undefined');
			const obj = parser.parseValue();
			debug.assert(parser.getValue()).equals(' undefined');
			debug.assert(obj).is('null');
		});

		// true

		it('can parse true', () => {
			const parser = new PromptParser('true');
			const obj = parser.parseValue();
			debug.assert(parser.getValue()).equals('');
			debug.assert(obj).is('true');
		});

		it('can parse true with more data', () => {
			const parser = new PromptParser('true undefined');
			const obj = parser.parseValue();
			debug.assert(parser.getValue()).equals(' undefined');
			debug.assert(obj).is('true');
		});

		it('can parse true with leading whitespace and more data', () => {
			const parser = new PromptParser('    true undefined');
			const obj = parser.parseValue();
			debug.assert(parser.getValue()).equals(' undefined');
			debug.assert(obj).is('true');
		});

		// false

		it('can parse false', () => {
			const parser = new PromptParser('false');
			const obj = parser.parseValue();
			debug.assert(parser.getValue()).equals('');
			debug.assert(obj).is('false');
		});

		it('can parse false with more data', () => {
			const parser = new PromptParser('false undefined');
			const obj = parser.parseValue();
			debug.assert(parser.getValue()).equals(' undefined');
			debug.assert(obj).is('false');
		});

		it('can parse false with leading whitespace and more data', () => {
			const parser = new PromptParser('    false undefined');
			const obj = parser.parseValue();
			debug.assert(parser.getValue()).equals(' undefined');
			debug.assert(obj).is('false');
		});

		// undefined

		it('can parse undefined', () => {
			const parser = new PromptParser('undefined');
			const obj = parser.parseValue();
			debug.assert(parser.getValue()).equals('');
			debug.assert(obj).is('undefined');
		});

		it('can parse undefined with more data', () => {
			const parser = new PromptParser('undefined undefined');
			const obj = parser.parseValue();
			debug.assert(parser.getValue()).equals(' undefined');
			debug.assert(obj).is('undefined');
		});

		it('can parse undefined with leading whitespace and more data', () => {
			const parser = new PromptParser('    undefined undefined');
			const obj = parser.parseValue();
			debug.assert(parser.getValue()).equals(' undefined');
			debug.assert(obj).is('undefined');
		});

		// string

		it('can parse a string without quotes', () => {
			const parser = new PromptParser('foobar');
			const obj = parser.parseValue();
			debug.assert(parser.getValue()).equals('');
			debug.assert(obj).is('string').equals('foobar');
		});

		it('can parse a string without quotes with a space', () => {
			const parser = new PromptParser('foo bar');
			const obj = parser.parseValue();
			debug.assert(parser.getValue()).equals(' bar');
			debug.assert(obj).is('string').equals('foo');
		});

		it('can parse a string with double quotes', () => {
			const parser = new PromptParser('"foo bar"');
			const obj = parser.parseValue();
			debug.assert(parser.getValue()).equals('');
			debug.assert(obj).is('string').equals('foo bar');
		});

		it('can parse a string with double quotes, with more data', () => {
			const parser = new PromptParser('"foo bar" 1234');
			const obj = parser.parseValue();
			debug.assert(parser.getValue()).equals(' 1234');
			debug.assert(obj).is('string').equals('foo bar');
		});

		it('can parse a string with single quotes', () => {
			const parser = new PromptParser("'foo bar'");
			const obj = parser.parseValue();
			debug.assert(parser.getValue()).equals('');
			debug.assert(obj).is('string').equals('foo bar');
		});

		it('can parse a string with single quotes, with more data', () => {
			const parser = new PromptParser("'foo bar' 1234");
			const obj = parser.parseValue();
			debug.assert(parser.getValue()).equals(' 1234');
			debug.assert(obj).is('string').equals('foo bar');
		});

		// number

		it('can parse a number', () => {
			const parser = new PromptParser('123');
			const obj = parser.parseValue();
			debug.assert(parser.getValue()).equals('');
			debug.assert(obj).is('number').equals(123);
		});

		it('can parse a number with more data', () => {
			const parser = new PromptParser('123 abcdefg');
			const obj = parser.parseValue();
			debug.assert(parser.getValue()).equals(' abcdefg');
			debug.assert(obj).is('number').equals(123);
		});

		it('can parse a float number', () => {
			const parser = new PromptParser('123.123');
			const obj = parser.parseValue();
			debug.assert(parser.getValue()).equals('');
			debug.assert(obj).is('number').equals(123.123);
		});


	});

	describe('#parseValues()', () => {

		it('can parse array', () => {
			const parser = new PromptParser('[1,2,3]');
			let values = parser.parseValues();
			debug.assert(parser.getValue()).equals('');
			debug.assert(values).is('array').length(1);

			values = values.shift();

			debug.assert(values).is('array').length(3);
			debug.assert(values[0]).equals(1);
			debug.assert(values[1]).equals(2);
			debug.assert(values[2]).equals(3);
		});

		it('can parse array and string', () => {
			const parser = new PromptParser('[1,2,3] "foo bar"');
			let parts = parser.parseValues();
			debug.assert(parser.getValue()).equals('');
			debug.assert(parts).is('array').length(2);

			let values = parts.shift();

			debug.assert(values).is('array').length(3);
			debug.assert(values[0]).equals(1);
			debug.assert(values[1]).equals(2);
			debug.assert(values[2]).equals(3);

			values = parts.shift();

			debug.assert(values).is('string').equals("foo bar");

		});

	});

	describe('#parsePrompt()', () => {

		it('can parse array', () => {
			const parser = new PromptParser('[1,2,3]');
			let values = parser.parsePrompt();
			debug.assert(parser.getValue()).equals('');
			debug.assert(values).is('array').length(1);
			values = values.shift();
			debug.assert(values).is('array').length(3);
			debug.assert(values[0]).equals(1);
			debug.assert(values[1]).equals(2);
			debug.assert(values[2]).equals(3);
		});

		it('can parse array and string', () => {
			const parser = new PromptParser('[1,2,3] "foo bar"');
			let parts = parser.parsePrompt();
			debug.assert(parser.getValue()).equals('');
			debug.assert(parts).is('array').length(2);
			let values = parts.shift();
			debug.assert(values).is('array').length(3);
			debug.assert(values[0]).equals(1);
			debug.assert(values[1]).equals(2);
			debug.assert(values[2]).equals(3);
			values = parts.shift();
			debug.assert(values).is('string').equals("foo bar");
		});

		it('can parse escaped string', () => {
			const parser = new PromptParser('"foo \\"Hello bar\\""');
			let parts = parser.parsePrompt();
			debug.assert(parser.getValue()).equals('');
			debug.assert(parts).is('array').length(1);
			let values = parts.shift();
			debug.assert(values).is('string').equals("foo \"Hello bar\"");
		});

		it('can parse escaped reverse solidus', () => {
			const parser = new PromptParser('"foo \\\\"');
			let parts = parser.parsePrompt();
			debug.assert(parser.getValue()).equals('');
			debug.assert(parts).is('array').length(1);
			let values = parts.shift();
			debug.assert(values).is('string').equals("foo \\");
		});

		it('can parse escaped solidus', () => {
			const parser = new PromptParser('"foo \\/"');
			let parts = parser.parsePrompt();
			debug.assert(parser.getValue()).equals('');
			debug.assert(parts).is('array').length(1);
			let values = parts.shift();
			debug.assert(values).is('string').equals("foo /");
		});

		it('can parse backspace', () => {
			const parser = new PromptParser('"foo \\b"');
			let parts = parser.parsePrompt();
			debug.assert(parser.getValue()).equals('');
			debug.assert(parts).is('array').length(1);
			let values = parts.shift();
			debug.assert(values).is('string').equals("foo \b");
		});

		it('can parse formfeed', () => {
			const parser = new PromptParser('"foo \\f"');
			let parts = parser.parsePrompt();
			debug.assert(parser.getValue()).equals('');
			debug.assert(parts).is('array').length(1);
			let values = parts.shift();
			debug.assert(values).is('string').equals("foo \f");
		});

		it('can parse new line', () => {
			const parser = new PromptParser('"foo \\n"');
			let parts = parser.parsePrompt();
			debug.assert(parser.getValue()).equals('');
			debug.assert(parts).is('array').length(1);
			let values = parts.shift();
			debug.assert(values).is('string').equals("foo \n");
		});

		it('can parse carriage return', () => {
			const parser = new PromptParser('"foo \\r"');
			let parts = parser.parsePrompt();
			debug.assert(parser.getValue()).equals('');
			debug.assert(parts).is('array').length(1);
			let values = parts.shift();
			debug.assert(values).is('string').equals("foo \r");
		});

		it('can parse horizontal tab', () => {
			const parser = new PromptParser('"foo \\t"');
			let parts = parser.parsePrompt();
			debug.assert(parser.getValue()).equals('');
			debug.assert(parts).is('array').length(1);
			let values = parts.shift();
			debug.assert(values).is('string').equals("foo \t");
		});

		it('can parse unicode', () => {
			const parser = new PromptParser('"foo\\u1680bar"');
			let parts = parser.parsePrompt();
			debug.assert(parser.getValue()).equals('');
			debug.assert(parts).is('array').length(1);
			let values = parts.shift();
			debug.assert(values).is('string').equals("foo\u1680bar");
		});

	});

	describe('#parseFunction()', () => {


		it('can parse function', () => {
			const parser = new PromptParser('`echo`');

			let f = parser.parseFunction();
			debug.assert(parser.getValue()).equals('');
			debug.assert(f).is('function');

			let lines = f();
			debug.assert(lines).is('array').length(1);

			let data = lines.shift();
			debug.assert(data).is('array').length(1);

			debug.assert(data.shift()).is('string').equals('echo');

		});

		it('can parse function with two lines', () => {
			const parser = new PromptParser('`echo;exit`');

			let f = parser.parseFunction();
			debug.assert(parser.getValue()).equals('');
			debug.assert(f).is('function');

			let lines = f();
			debug.assert(lines).is('array').length(2);

			let data = lines.shift();
			debug.assert(data).is('array').length(1);
			debug.assert(data.shift()).is('string').equals('echo');

			data = lines.shift();
			debug.assert(data).is('array').length(1);
			debug.assert(data.shift()).is('string').equals('exit');

		});

	});

});