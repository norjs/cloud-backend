/**
 * @module cloud-backend
 */

import GenericParser from './GenericParser.js';

/** Parser for our interactive CLI prompt.
 *
 *  Format is mostly JS/JSON compatible, with few custom formats, with support for
 * `undefined` and also functions using backstick operator.
 *
 * @class PromptParser
 * @extends GenericParser
 */
class PromptParser extends GenericParser {

	/** Construct a parser context
	 *
	 * @param line {string} The data to parse.
	 */
	constructor (line) {
		super(line);
	}

	/** Parse an object from data next in the buffer.
	 *
	 * Example buffer content: `{a: 1, b: 2, c: 3}`
	 *
	 * @returns {Object} The parsed object
	 */
	parseObject () {
		//debug.log('.parseObject()');

		let boundaryTest = () => this.startsWith(':');
		let boundaryTest2 = () => this.startsWith(',') || this.startsWith('}');

		let ret = {};

		this.eatWhite().eatString('{').eatWhite();

		this.setBoundary(boundaryTest2);

		while (!this.startsWith('}')) {

			this.setBoundary(boundaryTest);
			const key = this.parseString();
			this.unsetBoundary(boundaryTest);

			this.eatWhite().eatString(':');

			ret[key] = this.parseValue();

			this.eatWhite();

			if (this.startsWith(',')) {
				this.eatString(',');
				this.eatWhite();
				continue;
			}

			if (this.startsWith('}')) break;

			this.throwParseError();
		}

		this.unsetBoundary(boundaryTest2);

		this.eatString('}');

		return ret;
	}

	/**
	 *
	 * Parse an array from data next in the buffer.
	 *
	 * Example buffer content: `[1, 2, 3]`
	 *
	 * @returns {Array} The parsed array
	 */
	parseArray () {
		//debug.log('.parseArray()');

		let boundaryTest = () => this.startsWith(',') || this.startsWith(']');

		let ret = [];

		this.eatWhite().eatString('[').eatWhite();

		this.setBoundary(boundaryTest);

		while (!this.startsWith(']')) {

			const value = this.parseValue();
			ret.push(value);

			this.eatWhite();

			if (this.startsWith(',')) {
				this.eatString(',');
				this.eatWhite();
				continue;
			}

			if (this.startsWith(']')) break;

			this.throwParseError();
		}

		this.unsetBoundary(boundaryTest);
		this.eatString(']');

		return ret;

	}

	/**
	 *
	 * Parse a null from data next in the buffer.
	 *
	 * Buffer should match ` *null\b`.
	 *
	 * @returns {null}
	 */
	parseNull () {
		this.eatWhite().eatString('null');
		if ( this.notBoundary() ) this.throwParseError();
		return null;
	}

	/**
	 *
	 * Parse an undefined from data next in the buffer.
	 *
	 * Buffer should match ` *undefined\b`.
	 *
	 * @returns {undefined} Always `undefined`
	 * @throws TypeError
	 */
	parseUndefined () {
		this.eatWhite().eatString('undefined');
		if ( this.notBoundary() ) this.throwParseError();
	}

	/** Parse a true from data next in the buffer.
	 *
	 * Buffer should match ` *true\b`.
	 *
	 * @returns {boolean} Always `true`
	 */
	parseTrue () {
		//debug.log('.parseTrue()');
		this.eatWhite().eatString('true');
		if ( this.notBoundary() ) this.throwParseError();
		//this.eatWhite();
		return true;
	}

	/**
	 *
	 * Parse a false from data next in the buffer.
	 *
	 * Buffer should match ` *false\b`.
	 *
	 * @returns {boolean} Always `false`
	 */
	parseFalse () {
		//debug.log('.parseFalse()');
		this.eatWhite().eatString('false');
		if ( this.notBoundary() ) this.throwParseError();
		//this.eatWhite();
		return false;
	}

	/**
	 *
	 * Parse a string from data next in the buffer.
	 *
	 * @returns {string} The parsed string
	 */
	parseString () {
		let ret = "";

		this.eatWhite();

		if (this.isEmpty()) this.throwParseError();

		let quote;
		if (this.startsWith('"')) quote = '"';
		if (this.startsWith("'")) quote = "'";

		// If no quote character, parse until boundary
		if (!quote) {
			while (this.notBoundary()) {
				ret += this.parseAmount(1);
			}
			return ret;
		}

		this.eatString(quote);

		while (!this.startsWith(quote)) {

			if (this.isEmpty()) this.throwParseError();

			if (this.startsWith('\\')) {
				this.eatString('\\');

				// Quotation Mark
				if (this.startsWith(quote)) {
					this.eatString(quote);
					ret += quote;
					continue;
				}

				// Reverse solidus
				if (this.startsWith('\\')) {
					this.eatString('\\');
					ret += '\\';
					continue;
				}

				// Solidus
				if (this.startsWith('/')) {
					this.eatString('/');
					ret += '/';
					continue;
				}

				// Backspace
				if (this.startsWith('b')) {
					this.eatString('b');
					ret += '\b';
					continue;
				}

				// Formfeed
				if (this.startsWith('f')) {
					this.eatString('f');
					ret += '\f';
					continue;
				}

				// New line
				if (this.startsWith('n')) {
					this.eatString('n');
					ret += '\n';
					continue;
				}

				// Carriage return
				if (this.startsWith('r')) {
					this.eatString('r');
					ret += '\r';
					continue;
				}

				// Horizontal tab
				if (this.startsWith('t')) {
					this.eatString('t');
					ret += '\t';
					continue;
				}

				// Unicode
				if (this.startsWith('u')) {
					this.eatString('u');
					const hex = this.parseAmount(4);
					ret += JSON.parse("\"\\u" + hex + '"');
					continue;
				}

				this.throwParseError();
			}

			ret += this.parseAmount(1);
		}

		this.eatString(quote);

		return ret;
	}

	/**
	 *
	 * Parse a number from data next in the buffer.
	 *
	 * @returns {number} The parsed number
	 */
	parseNumber () {

		let tmp = "";

		this.eatWhite();

		if (this.startsWith('-')) {
			this.eatString('-').eatWhite();
			tmp += '-';
		}

		if (!this.startsWithDigit()) this.throwParseError();

		tmp += this.parseAmount(1);

		if (tmp[tmp.length-1] !== '0') {
			while (this.startsWithDigit()) {
				tmp += this.parseAmount(1);
			}
		}

		if (this.startsWith('.')) {
			this.eatString('.');
			tmp += '.';
			while (this.startsWithDigit()) {
				tmp += this.parseAmount(1);
			}
		}

		if (this.startsWith('e') || this.startsWith('E')) {
			tmp += this.parseAmount(1);

			if (this.startsWith('-') || this.startsWith('+')) {
				tmp += this.parseAmount(1);
			}

			while (this.startsWithDigit()) {
				tmp += this.parseAmount(1);
			}
		}

		return JSON.parse(tmp);
	}

	/**
	 *
	 * Parse any value from data next in the buffer.
	 *
	 * @returns {*}
	 */
	parseValue () {
		this.eatWhite();

		if (this.startsWith('`')) return this.parseFunction();
		if (this.startsWith('{')) return this.parseObject();
		if (this.startsWith('[')) return this.parseArray();
		if (this.startsWith('"')) return this.parseString();
		if (this.startsWith("'")) return this.parseString();
		if (this.startsWith("-")) return this.parseNumber();
		if (this.startsWithDigit()) return this.parseNumber();
		if (this.startsWithWord('true')) return this.parseTrue();
		if (this.startsWithWord('false')) return this.parseFalse();
		if (this.startsWithWord('undefined')) return this.parseUndefined();
		if (this.startsWithWord('null')) return this.parseNull();
		if (this.startsWithAlpha()) return this.parseString();

		this.throwParseError();
	}

	/**
	 *
	 * Parse multiple values from data next in the buffer into an array.
	 *
	 * Buffer should contain: ` *(VALUE)?( +(VALUE))*`
	 *
	 * @returns {Array} Parsed values in an array.
	 */
	parseValues () {
		let ret = [];
		this.eatWhite();
		while (this.notEmpty()) {

			ret.push(this.parseValue());

			if (this.startsWithWhite()) {
				this.eatWhite();
				continue;
			}

			if (this.isEmpty()) break;
			if (this.isBoundary()) break;

			this.throwParseError();
		}

		return ret;
	}

	/**
	 *
	 * Parse a backstick block into a function.
	 *
	 * @returns {function(): Array}
	 */
	parseFunction () {
		let ret = [];

		let boundaryTest = () => this.startsWith('`') || this.startsWith(';');

		this.eatWhite().eatString('`').setBoundary(boundaryTest).eatWhite();

		while (!this.startsWith('`')) {

			const values = this.parsePrompt();
			ret.push(values);

			this.eatWhite();

			if (this.startsWith(';')) {
				this.eatString(';');
				continue;
			}

			if (this.startsWith('`')) break;

			this.throwParseError();
		}

		this.unsetBoundary(boundaryTest).eatString('`');

		return () => ret;
	}

	/**
	 * Parse a line of parameters from data next in the buffer.
	 *
	 * Example format `command '{"content":"Hello World"} 1234'` into {Array} ["command", {"content":"Hello World"}, 1234]
	 *
	 * @returns {Array} Parsed values in an array
	 */
	parsePrompt () {
		return this.parseValues();
	}

}

// Exports
export default PromptParser;
