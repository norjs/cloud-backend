/**
 * parsePrompt() function.
 *
 * @module @sendanor/cloud-backend
 */

import PromptParser from './PromptParser.js';

/** Parse a line of parameters.
 *
 * @Example
 *
 * const values = parsePrompt('command {"content":"Hello World"} 1234')
 * values === ["command", {"content":"Hello World"}, 1234]
 *
 * @param line {String} A string with one string command and zero or more JSON-like parameters.
 * @returns {Array} Parsed values in an array
 * @static
 */
function parsePrompt (line) {
	const parser = new PromptParser(line);
	return parser.parsePrompt();
}

export {
	parsePrompt
}

export default parsePrompt;