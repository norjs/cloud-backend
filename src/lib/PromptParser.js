
import GenericParser from './GenericParser.js';

/** Parser for our prompt arguments, which are mostly JSON including few custom formats */
export default class PromptParser extends GenericParser {

	/** Construct a parser context
	 * @param line {string}
	 */
	constructor (line) {
		super(line);
	}

	/** Parse next object
	 *
	 * @returns {Object}
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

			const value = this.parseValue();
			ret[key] = value;

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

	/** Parse next array
	 *
	 * @returns {Array}
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

	/** Parse next null
	 *
	 * @returns {null}
	 */
	parseNull () {
		//debug.log('.parseNull()');
		this.eatWhite().eatString('null');
		if ( this.notBoundary() ) this.throwParseError();
		//this.eatWhite();
		return null;
	}

	/** Parse next undefined
	 * @returns {undefined}
	 */
	parseUndefined () {
		//debug.log('.parseUndefined()');
		this.eatWhite().eatString('undefined');
		if ( this.notBoundary() ) this.throwParseError();
		//this.eatWhite();
		return;
	}

	/** Parse next true
	 * @returns {boolean} Always true
	 */
	parseTrue () {
		//debug.log('.parseTrue()');
		this.eatWhite().eatString('true');
		if ( this.notBoundary() ) this.throwParseError();
		//this.eatWhite();
		return true;
	}

	/** Parse next false
	 * @returns {boolean} Always false
	 */
	parseFalse () {
		//debug.log('.parseFalse()');
		this.eatWhite().eatString('false');
		if ( this.notBoundary() ) this.throwParseError();
		//this.eatWhite();
		return false;
	}

	/** Parse next string
	 * @returns {string} Parsed string
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

				// formfeed
				if (this.startsWith('f')) {
					this.eatString('f');
					ret += '\f';
					continue;
				}

				// new line
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

				// unicode
				if (this.startsWith('u')) {
					this.eatString('u');
					const hex = this.parseAmount(4);
					ret += JSON.parse("\\u" + hex);
					continue;
				}

				this.throwParseError();
			}

			ret += this.parseAmount(1);
		}

		this.eatString(quote);

		return ret;
	}

	/** Parse next number
	 * @returns {number} Parsed number
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

	/** Parse next value
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

	/** Parse multiple values into an array
	 * @returns {Array}
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

	/** Parse function
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

	/** Parse a line of parameters, example `command '{"content":"Hello World"} 1234'` into {Array} ["command", {"content":"Hello World"}, 1234]
	 * @param line {String} A string with one string command and zero or more JSON-like parameters.
	 * @returns {Array} Parsed values in an array
	 */
	parsePrompt () {
		return this.parseValues();
	}

}
