/**
 * @module @sendanor/cloud-backend
 */

import {
	Q,
	_,
	debug,
	getAllKeys,
	notPrivate,
	parsePrompt
} from '../lib/index.js';

import readline from 'readline';

/** This service implements an interactive command line interface
 *
 * @static
 */
class PromptService {

	constructor (MainService, ServiceCache) {

		this._main = MainService;

		this._ServiceCache = ServiceCache;

		/** Current custom commands */
		this._customCommands = {};

		/** {Array.<Object>} Context path */
		this._contextPath = [ServiceCache];

		/** {Object} Current context object */
		this._context = ServiceCache;

		/** {Object.<ServiceId,ServiceObject>} */
		this._services = {};

	}

	/**
	 *
	 * @param config
	 * @returns {Promise}
	 * @private
	 */
	$onConfig (config) {
		debug.assert(config).is('object');
		debug.assert(config.prompt).ignore(undefined).is('defined');
		const promptContext = config && config.prompt || null;

		if (_.isString(promptContext)) {
			return this._changeContext(promptContext);
		}

		return Q.when(this._main.getFirstServiceUUID()).then(id => _.isString(id) && this._changeContext(id));
	}

	/** Initialize command line interface
	 *
	 * @returns {Promise}
	 * @private
	 */
	$onInit () {

		/** Readline Interface */
		this._rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			removeHistoryDuplicates: true,
			completer: line => this._completer(line)
		});

		this._rl.on('line',
			line => Q.when(this._onLine(line)).fail(err => this._onError(err)).then( () => this._runPrompt() ).fail(err => this._onError(err)).done()
		);

		this._customCommands = {};

		this._updateCommands();

		return this._updateServiceCache().then( () => this._updatePrompt() ).then(() => this._runPrompt());
	}

	/** Update commands array
	 *
	 * @private
	 */
	_updateCommands () {
		/** {Array.<String>} List of available commands */
		this._commands = this._getCommands();
	}

	/**
	 *
	 * @private
	 */
	_runPrompt () {
		this._rl && this._rl.prompt();
	}

	/** Set command line prompt
	 *
	 * @param value {string}
	 * @private
	 */
	_setPrompt (value) {
		debug.assert(value).is('string');
		this._rl && this._rl.setPrompt(value);
	}

	/** Get a path name from object in path
	 *
	 * @param context
	 * @returns {*}
	 * @private
	 */
	_getPathName (context) {
		return this._getType(context);
	}

	/** Returns current prompt based on context
	 * @returns {Array.<String>}
	 * @private
	 */
	_getPrompt () {
		return '[' + _.map(this._contextPath, path => this._getPathName(path)).join('/') + ']> ';
	}

	/**
	 *
	 * @private
	 */
	_updatePrompt () {
		this._setPrompt(this._getPrompt());
	}

	/** Uninitialize prompt
	 * @private
	 */
	$onDestroy () {
		this._rl && this._rl.close();
	}

	/**
	 *
	 * @param err
	 * @private
	 */
	_onError (err) {
		debug.error(err);
	}

	/** Parse input line
	 * @param line {string}
	 * @private
	 */
	_onLine (line) {
		return Q.fcall( () => {

			const argv = parsePrompt(line);

			const command = argv.shift() || '';
			if (!command) return; // Ignore empty commands

			// Unknown commands
			if (this._commands.indexOf(command) < 0) {
				console.log('Unknown command: ' + command);
				return;
			}

			// Built-in commands
			const method = 'on' + _.upperFirst(command);
			if (_.isFunction(this[method])) {
				return Q.when(this[method](...argv));
			}

			// Custom commands
			if (_.has(this._customCommands, command) && _.isFunction(this._customCommands[command])) {
				return Q.when(this._customCommands[command](...argv));
			}

			// Context commands
			const contextMethod = command;
			if (_.isFunction(this._context[contextMethod])) {
				return Q.when(this._context[contextMethod](...argv));
			}

			// Unknown commands
			console.log('Command not found: ' + command);

		}).then(response => {
			if (response !== undefined) {
				console.log( '{' + this._getType(response) + '} ' + JSON.stringify(response, null, 2) );
			}
		});
	}

	/** Returns list of commands available
	 *
	 * @returns {Array}
	 * @private
	 */
	_getCommands () {
		const customCommands = Object.keys(this._customCommands);

		const builtInCommands = _.filter(getAllKeys(this), key => key.startsWith('on')).map(key => key.substr(2).toLowerCase());

		const contextCommands = _.filter(getAllKeys(this._context), notPrivate);

		return _.concat(customCommands, builtInCommands, contextCommands);
	}

	/** Completer
	 *
	 * @param line
	 * @returns {Array}
	 * @private
	 */
	_completer (line) {
		line = _.trim(line).toLowerCase();
		const hits = _.filter(this._commands, c => c.startsWith(line));
		return [hits && hits.length ? hits : this._commands, line];
	}

	/** Register a new command
	 * @param name {string}
	 * @param f {function}
	 */
	addCommand (name, f) {
		debug.assert(name).is('string');
		debug.assert(f).is('function');
		if (this._commands.indexOf(name) >= 0) {
			throw new TypeError("Command exists already: "+ name);
		}
		this._customCommands[name] = f;
		this._updateCommands();
	}

	/** Update internal cache for services
	 *
	 * @returns {Promise}
	 * @private
	 */
	_updateServiceCache () {
		let newData = {};
		return this._ServiceCache.getUUIDs().then(
			uuids => Q.all(_.map(uuids,
				uuid =>  this._ServiceCache.get(uuid).then(service => newData[uuid] = service)
			))
		).then(() => this._services = newData);
	}

	/** Exit program
	 *
	 */
	onExit () {

		// FIXME: Shutdown services.

		process.exit(0);
	}

	/** Alias for exit
	 *
	 * @returns {*}
	 */
	onQuit () {
		return this.onExit();
	}

	/** Returns type as string
	 *
	 * @param value
	 * @returns {*}
	 * @private
	 */
	_getType (value) {
		if (_.isArray(value)) return 'array';
		if (_.isObject(value)) return _.get(value, 'constructor.name') || 'object';
		if (_.isNull(value)) return 'null';
		if (value === undefined) return 'undefined';

		const type = typeof value;
		return type;
	}

	/** Returns a value of key
	 *
	 * @param context
	 * @param key
	 * @private
	 */
	__getValue (context, key) {
		return JSON.stringify(context[key]);
	}

	/** Returns a value of key
	 *
	 * @param context
	 * @param key
	 * @returns {*}
	 * @private
	 */
	_getValue (context, key) {
		try {
			return this.__getValue(context, key);
		} catch (err) {
			return '!error ' + err;
		}
	}

	/**
	 *
	 * @param value
	 * @private
	 */
	_getName (value) {
		return _.get(value, 'constructor.name');
	}

	/** Print context
	 *
	 * @param newContext
	 * @returns {*}
	 */
	onContext (newContext) {

		if (newContext) {
			return this._changeContext(newContext);
		}

		const context = this._context;
		const type = this._getType(context);
		console.log([
			"Context is a {" + type + "}:",
			"  with properties:",
		].concat(_.keys(context).filter(notPrivate).map(
			key => '    - ' + key + ' {' + this._getType(type) + '} => ' + this._getValue(context, key)
		)).join('\n'));
	}

	/**
	 *
	 * @param name
	 * @returns {Promise.<TResult>|*}
	 * @private
	 */
	_changeContext (name) {

		if (_.isObject(name)) {
			this._contextPath = [name];
			this._context = name;
			return Q.all([
				Q.when(this._updatePrompt()),
				Q.when(this._updateCommands())
			]).then( () => {} );
		}

		if (_.isString(name)) {
			return this._ServiceCache.get(name).then( obj => this._changeContext(obj) );
		}

		throw new TypeError("Unsupported context type: " + name);
	}

	/** Sample command
	 *
	 * @param args
	 */
	onEcho (...args) {
		console.log( args.map(arg => {
			if (arg === undefined) return 'undefined';
			if (_.isFunction(arg)) return 'Function';
			return JSON.stringify(arg);
		}).join(', ') );
	}

	/** List all available contexts
	 *
	 */
	onLs () {
		const contexts = Object.keys(this._services).map(
			serviceId => '[' + serviceId + '] ' + this._getName(this._services[serviceId])
		);

		console.log( contexts.map(context => '  ' + context).join('\n') )
	}

	/** Change to context
	 *
	 * @param name
	 * @returns {*}
	 */
	onCd (name) {
		debug.assert(name).is('string');
		return this.onContext(name);
	}

	/** Alias for cd
	 *
	 * @param name
	 * @returns {*}
	 */
	onUse (name) {
		return this.onCd(name);
	}

	/** Alias for cd
	 *
	 * @param name
	 * @returns {*}
	 */
	onChange (name) {
		return this.onCd(name);
	}

}

export default PromptService;