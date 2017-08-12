import _ from 'lodash';
import debug from 'nor-debug';

/** Generic parser implementation */
export default class GenericParser {

	/** Construct a parser context
	 * @param line {string}
	 */
	constructor (line) {
		debug.assert(line).ignore(undefined).is('string');
		this._line = line || '';
	}

	/** Eat whitespaces from start */
	eatWhite () {
		this._line = _.trimStart(this._line);
		return this;
	}

	/** Eat characters from beging
	 * @param amount {Number} How many characters to eat
	 */
	eatAmount (amount) {
		debug.assert(amount).is('number');
		this._line = this._line.substr(amount);
		return this;
	}

	/** Eat a string, if possible
	 * @param amount {Number} How many characters to eat
	 */
	eatString (value) {
		debug.assert(value).is('string');
		if (!this.startsWith(value)) throw new TypeError("Value not found");
		return this.eatAmount(value.length);
	}

	/** Check if no more data
	 * @returns {boolean} True if internal buffer is empty.
	 */
	isEmpty () {
		return this._line === "";
	}

	/** Returns true if starts with string
	 * @param target {string}
	 * @returns {boolean}
	 */
	startsWith (target) {
		debug.assert(target).is('string');
		return _.startsWith(this._line, target);
	}

	/** Returns true if starts with digit ('0'-'9')
	 * @param target {string}
	 * @returns {boolean}
	 */
	startsWithDigit () {
		return this._line.length && '0123456789'.indexOf(this._line[0]) >= 0;
	}

	/** Throw a parse error */
	throwParseError () {
		throw new TypeError("Failed to parse at " + this._line.substr(0, 50) );
	}

	/** Parse next `amount` characters
	 * @param amount {number} Amount of characters to parse
	 */
	parseAmount (amount) {
		debug.assert(amount).is('number');

		if (this._line.length < amount) {
			this.throwParseError();
		}

		const ret = this._line.substr(0, amount);
		this._line = this._line.substr(amount);
		return ret;
	}

}
