/**
 * @module cloud-backend
 */

import _ from 'lodash';
import debug from 'nor-debug';
import ParseError from './ParseError.js';

/** Generic parser implementation */
class GenericParser {

	/** Construct a parser context
	 * @param line {string}
	 */
	constructor (line) {
		debug.assert(line).ignore(undefined).is('string');
		this._line = line || '';

		this._boundaries = [
			() => this.isEmpty() || this.startsWithWhite()
		];

	}

	/**
	 * Get current parse buffer
	 * @returns {string}
	 */
	getValue () {
		return this._line;
	}

	/** Set boundary test
	 *
	 * @param f {function}
	 * @returns {GenericParser}
	 */
	setBoundary (f) {
		debug.assert(f).is('function');
		this._boundaries.push(f);
		return this;
	}

	/** Unset boundary test
	 *
	 * @param f {function}
	 * @returns {GenericParser}
	 */
	unsetBoundary (f) {
		debug.assert(f).is('function');
		_.pull(this._boundaries, f);
		return this;
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
	 * @param value {string} The string to eat, must be in the buffer, otherwise throws an parse error
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

	/** Check if we're at a boundary by executing boundary tests
	 * @returns {boolean} true if we're at the boundary
	 */
	isBoundary () {
		return _.some(this._boundaries, f => f());
	}

	/** Check if we're not at a boundary
	 * @returns {boolean} true if we either
	 */
	notBoundary () {
		return !this.isBoundary();
	}

	/** Returns true if next buffer starts with a string
	 * @param target {string}
	 * @returns {boolean}
	 */
	startsWith (target) {
		debug.assert(target).is('string');
		return _.startsWith(this._line, target);
	}

	/** Returns true if next buffer starts with a string and ends in a white space
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

	/** Returns true if next buffer starts with a digit ('0'-'9')
	 * @param target {string}
	 * @returns {boolean}
	 */
	startsWithDigit () {
		return !!(this._line.length && '0123456789'.indexOf(this._line[0]) >= 0);
	}

	/** Returns true if next buffer starts with an alpha character (a-z, A-Z)
	 * @param target {string}
	 * @returns {boolean}
	 */
	startsWithAlpha () {
		return !!(this._line.length && 'qwertyuiopasdfghjklzxcvbnm'.indexOf(this._line[0].toLowerCase()) >= 0);
	}

	/** Returns true if starts with a white space
	 * @param target {string}
	 * @returns {boolean}
	 */
	startsWithWhite () {
		return !!(this._line.length && this._isWhite(this._line[0]));
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
		throw new ParseError("Near " + ('"'+this._line.substr(0, 50) + '"') );
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

	/**
	 *
	 * @param char
	 * @returns {boolean}
	 * @private
	 */
	_isWhite (char) {
		return ' \f\n\r\t\v'.indexOf(char) >= 0;
	}

}

// Exports
export default GenericParser;
