/**
 * @module
 */

/**
 * Our parsing error for GenericParser and PromptParser.
 * @extends Error
 */
export default class ParseError extends Error {

	/**
	 * Create a ParseError
	 * @param {string} message
	 */
	constructor (message) {
		super(message);
		this.name = 'ParseError';
		if (typeof Error.captureStackTrace === 'function') {
			Error.captureStackTrace(this, this.constructor);
		} else {
			this.stack = (new Error(message)).stack;
		}
		Object.setPrototypeOf(this, ParseError.prototype);
	}

}
