
import PromptParser from './PromptParser.js';

/** Parse a line of parameters, example `'{"content":"Hello World"} 1234'` into {Array} [{"content":"Hello World"}, 1234]
 * @param line {String} A string with one or multiple JSON-like parameters.
 * @returns {Array} Parsed values in an array
 */
export function parsePrompt (line) {
	const parser = new PromptParser(line);
	return parser.parseValues();
}

export default parsePrompt;