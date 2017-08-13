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
		if (!this.startsWith(value)) this.throwParseError();
		return this.eatAmount(value.length);
	}

	/** Check if no more data
	 * @returns {boolean} True if internal buffer is empty.
	 */
	isEmpty () {
		return !this._line.length;
	}

	/** Check if we have data
	 * @returns {boolean} True if internal buffer is not empty.
	 */
	notEmpty () {
		return !!this._line.length;
	}

	/** Check if we're at a boundary
	 * @returns {boolean} true if we're either out of data or a white space is next character
	 */
	isBoundary () {
		return this.isEmpty() || this.startsWithWhite();
	}

	/** Check if we're not at a boundary
	 * @returns {boolean} true if we either
	 */
	notBoundary () {
		return !this.isBoundary();
	}

	/** Returns true if starts with string
	 * @param target {string}
	 * @returns {boolean}
	 */
	startsWith (target) {
		debug.assert(target).is('string');
		return _.startsWith(this._line, target);
	}

	/** Returns true if starts with string and ends in a boundary
	 * @param target {string}
	 * @returns {boolean}
	 */
	startsWithWord (target) {
		const l = this._line.length;
		const tl = target.length;
		if (l === tl) return this.startsWith(target);
		if (l < tl+1) return false;
		return this.startsWith(target) && this._isWhite(this._line[tl]);
	}


	/** Returns true if starts with digit ('0'-'9')
	 * @param target {string}
	 * @returns {boolean}
	 */
	startsWithDigit () {
		return this._line.length && '0123456789'.indexOf(this._line[0]) >= 0;
	}

	/** Returns true if starts with an alpha character (a-z, A-Z)
	 * @param target {string}
	 * @returns {boolean}
	 */
	startsWithAlpha () {
		return this._line.length && 'qwertyuiopasdfghjklzxcvbnm'.indexOf(this._line[0].toLowerCase()) >= 0;
	}

	_isWhite (char) {
		return ' \f\n\r\t\v'.indexOf(char) >= 0;
	}

	/** Returns true if starts with a white space
	 * @param target {string}
	 * @returns {boolean}
	 */
	startsWithWhite () {
		return this._line.length && this._isWhite(this._line[0]);
	}

	/** Returns false if starts with a white space, otherwise true.
	 * @param target {string}
	 * @returns {boolean}
	 */
	notStartsWithWhite () {
		return !this.startsWithWhite();
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

		if (this._line.length < amount) this.throwParseError();

		const ret = this._line.substr(0, amount);
		this._line = this._line.substr(amount);
		return ret;
	}

}
