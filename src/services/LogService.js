/**
 * @module @norjs/cloud-backend
 */

import {
	_
	, debug
	, moment
} from '../lib/index.js';

const LEVEL = {

	/**
	 * Every log level.
	 *
	 * Eg. `0`
	 */
	ALL: 0,

	/**
	 * Debug level and above.
	 *
	 * Eg. `1`
	 */
	DEBUG: 1,

	/**
	 * Log level and above.
	 *
	 * Eg. `2`
	 */
	LOG: 2,

	/**
	 * Info level and above.
	 *
	 * Eg. `3`
	 */
	INFO: 3,

	/**
	 * Warning level and above.
	 *
	 * Eg. `4`
	 */
	WARN: 4,

	/**
	 * Error level and above.
	 *
	 * Eg. `5`
	 */
	ERROR: 5,

	/**
	 * No log.
	 *
	 * Eg. `6`
	 */
	NONE: 6,

	/**
	 * No log.
	 *
	 * Eg. `6`
	 */
	OFF: 6

};

const DEFAULT_LEVEL = LEVEL.DEBUG;

const PRIVATE = {
	level: Symbol('level')
	, context: Symbol('context')
	, fullName: Symbol('fullName')
	, name: Symbol('name')
	, parent: Symbol('parent')
};

function handleErrors (f) {
	try {
		return f();
	} catch (err) {
		console.error('Exception: ', err);
	}
}

/** The log service
 */
class LogService {

	constructor () {
		this[PRIVATE.level] = DEFAULT_LEVEL;
		this[PRIVATE.name] = undefined;
		this[PRIVATE.fullName] = undefined;
		this[PRIVATE.parent] = undefined;
		this[PRIVATE.context] = {};
	}

	/**
	 * Creates a sub logging context.
	 *
	 * @param name {string}
	 */
	getContext (name) {

		if (!name) throw new TypeError("name is required for .getContext()");

		if (!_.has(this[PRIVATE.context], name)) {
			const subLog = new LogService();
			subLog.setLogLevel( this[PRIVATE.level] );

			subLog[PRIVATE.name] = name;
			subLog[PRIVATE.parent] = this;

			let fullName;
			if (_.has(this, PRIVATE.fullName)) {
				const parentFullName = this[PRIVATE.fullName];
				if (parentFullName) {
					fullName = `${parentFullName}.${name}`;
				} else {
					fullName = name;
				}
			} else {
				fullName = name;
			}
			this[PRIVATE.fullName] = fullName;

			// TODO: There could be support for reading the log level from parent until user changes it
			this[PRIVATE.context][name] = subLog;

			return subLog;
		}

		return this[PRIVATE.context][name];
	}

	/**
	 * Set log level.
	 *
	 * @param name {string}
	 */
	setLogLevel (name) {
		name = _.toUpper(name);
		if (!_.has(LEVEL, name)) {
			throw new TypeError("Unknown log level: " + name);
		}
		this[PRIVATE.level] = LEVEL[name];
	}

	/**
	 *
	 * @param args
	 */
	log (...args) {
		handleErrors( () => {
			if (this[PRIVATE.level] > LEVEL.LOG) return;
			console.log(moment().format() + (this[PRIVATE.fullName] ? ` [${this[PRIVATE.fullName]}] `: '') + ' ' + _.join(args, ' '))
		});
	}

	/**
	 *
	 * @param args
	 */
	info (...args) {
		handleErrors( () => {
			if (this[PRIVATE.level] > LEVEL.INFO) return;
			console.log(moment().format() + (this[PRIVATE.fullName] ? ` [${this[PRIVATE.fullName]}] `: '') + ' ' + _.join(args, ' '))
		});
	}

	/**
	 *
	 * @param args
	 */
	warn (...args) {
		handleErrors( () => {
			if (this[PRIVATE.level] > LEVEL.WARN) return;
			debug.warn((this[PRIVATE.fullName] ? ` [${this[PRIVATE.fullName]}] `: ''), ...args);
		});
	}

	/**
	 *
	 * @param args
	 */
	error (...args) {
		handleErrors( () => {
			if (this[PRIVATE.level] > LEVEL.ERROR) return;
			debug.error((this[PRIVATE.fullName] ? ` [${this[PRIVATE.fullName]}] `: ''), ...args);
		});
	}

	/**
	 *
	 * @param args
	 */
	debug (...args) {
		handleErrors( () => {
			if (this[PRIVATE.level] > LEVEL.DEBUG) return;
			debug.log((this[PRIVATE.fullName] ? ` [${this[PRIVATE.fullName]}] `: ''), ...args);
		});
	}

}

export default LogService;