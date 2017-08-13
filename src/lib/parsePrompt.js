
import PromptParser from './PromptParser.js';

/** Parse a line of parameters, example `command '{"content":"Hello World"} 1234'` into {Array} ["command", {"content":"Hello World"}, 1234]
 * @param line {String} A string with one string command and zero or more JSON-like parameters.
 * @returns {Array} Parsed values in an array
 */
export function parsePrompt (line) {
	const parser = new PromptParser(line);
	parser.eatWhite();
	if (parser.isEmpty()) return [];
	const command = parser.parseString();
	return [command].concat(parser.parseValues());
}

export default parsePrompt;