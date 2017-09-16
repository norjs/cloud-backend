/**
 * @module
 */

import {
	_,
	debug,
	moment
} from '../lib/index.js';

/** The main service to handle backend HTTP(s) requests */
export default class LogService {

	constructor () {
	}

	/**
	 *
	 * @param args
	 */
	log (...args) {
		console.log(moment().format() + ' ' + _.join(args, ' '))
	}

	/**
	 *
	 * @param args
	 */
	info (...args) {
		console.log(moment().format() + ' ' + _.join(args, ' '))
	}

	/**
	 *
	 * @param args
	 */
	warn (...args) {
		debug.warn(...args);
	}

	/**
	 *
	 * @param args
	 */
	error (...args) {
		debug.error(...args);
	}

	/**
	 *
	 * @param args
	 */
	debug (...args) {
		debug.log(...args);
	}

}
