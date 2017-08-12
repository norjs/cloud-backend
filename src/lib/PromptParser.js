
import GenericParser from './GenericParser.js';

/** Parser for our prompt arguments, which are mostly JSON including few custom formats */
export default class PromptParser extends GenericParser {

	/** Construct a parser context
	 * @param line {string}
	 */
	constructor (line) {
		super(line);
	}

	/** Parse next object */
	parseObject () {
		//debug.log('.parseObject()');

		let ret = {};

		this.eatWhite().eatString('{').eatWhite();

		while (!this.startsWith('}')) {

			const key = this.parseString();
			this.eatWhite().eatString(':');
			const value = this.parseValue();
			ret[key] = value;

			this.eatWhite();

			if (this.startsWith(',')) {
				this.eatString(',');
				continue;
			}

			if (this.startsWith('}')) break;

			this.throwParseError();
		}

		this.eatString('}');

		return ret;
	}

	/** Parse next array */
	parseArray () {
		//debug.log('.parseArray()');

		let ret = [];

		this.eatWhite().eatString('[').eatWhite();

		while (!this.startsWith(']')) {

			const value = this.parseValue();
			ret.push(value);

			this.eatWhite();

			if (this.startsWith(',')) {
				this.eatString(',');
				continue;
			}

			if (this.startsWith(']')) break;

			this.throwParseError();
		}

		this.eatString(']');

		return ret;

	}

	/** Parse next null */
	parseNull () {
		//debug.log('.parseNull()');
		this.eatWhite().eatString('null');
		return null;
	}

	/** Parse next undefined */
	parseUndefined () {
		//debug.log('.parseUndefined()');
		this.eatWhite().eatString('undefined');
		return;
	}

	/** Parse next true
	 * @returns {boolean} Always true
	 */
	parseTrue () {
		//debug.log('.parseTrue()');
		this.eatWhite().eatString('true');
		return true;
	}

	/** Parse next false
	 * @returns {boolean} Always false
	 */
	parseFalse () {
		//debug.log('.parseFalse()');
		this.eatWhite().eatString('false');
		return false;
	}

	/** Parse next value
	 * @returns {Any}
	 */
	parseValue () {
		//debug.log('.parseValue()');
		this.eatWhite();

		if (this.startsWith('{')) return this.parseObject();
		if (this.startsWith('[')) return this.parseArray();
		if (this.startsWith('"')) return this.parseString();
		if (this.startsWith("'")) return this.parseString();
		if (this.startsWith("-")) return this.parseNumber();
		if (this.startsWithDigit()) return this.parseNumber();
		if (this.startsWith('true')) return this.parseTrue();
		if (this.startsWith('false')) return this.parseFalse();
		if (this.startsWith('undefined')) return this.parseUndefined();
		if (this.startsWith('null')) return this.parseNull();

		this.throwParseError();
	}

	/** Parse next string
	 * @returns {string} Parsed string
	 */
	parseString () {
		//debug.log('.parseString()');

		let ret = "";

		this.eatWhite();

		let quote;
		if (this.startsWith('"')) quote = '"';
		if (this.startsWith("'")) quote = "'";

		if (!quote) this.throwParseError();

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
		//debug.log('.parseNumber()');

		let tmp = "";

		this.eatWhite();

		if (this.startsWith('-')) {
			this.eatString('-').eatWhite();
			tmp += '-';
		}

		//debug.log('tmp =', tmp);

		if (!this.startsWithDigit()) this.throwParseError();

		tmp += this.parseAmount(1);

		//debug.log('tmp =', tmp);

		if (tmp[tmp.length-1] !== '0') {
			while (this.startsWithDigit()) {
				tmp += this.parseAmount(1);
			}
			//debug.log('tmp =', tmp);
		}

		if (this.startsWith('.')) {
			this.eatString('.');
			tmp += '.';
			while (this.startsWithDigit()) {
				tmp += this.parseAmount(1);
			}
			//debug.log('tmp =', tmp);
		}

		if (this.startsWith('e') || this.startsWith('E')) {
			tmp += this.parseAmount(1);

			if (this.startsWith('-') || this.startsWith('+')) {
				tmp += this.parseAmount(1);
			}

			while (this.startsWithDigit()) {
				tmp += this.parseAmount(1);
			}

			//debug.log('tmp =', tmp);
		}

		//debug.log('final tmp =', tmp);
		return JSON.parse(tmp);
	}

	/** Parse multiple values into an array
	 * @returns {Array}
	 */
	parseValues () {
		//debug.log('.parseValues()');
		let ret = [];
		this.eatWhite();
		while (!this.isEmpty()) {
			ret.push(this.parseValue());
		}
		//debug.log('.parseValues() ret = ', ret);
		return ret;
	}

}
