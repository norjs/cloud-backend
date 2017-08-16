import {
	Q,
	_,
	is,
	debug,
	getAllKeys,
	notPrivate,
	parsePrompt
} from '../lib/index.js';

import readline from 'readline';

/** This service implements a command line interface into cloud-backend */
export default class PromptService {

	constructor (MainService, ServiceCache) {

		this._main = MainService;

		this._ServiceCache = ServiceCache;

		/** {Array.<Object>} Context path */
		this._contextPath = [ServiceCache];

		/** {Object} Current context object */
		this._context = ServiceCache;

		/** {Object.<ServiceId,ServiceObject>} */
		this._services = {};

	}

	/** */
	$onConfig (config) {
		debug.assert(config).is('object');
		debug.assert(config.prompt).ignore(undefined).is('defined');
		const promptContext = config && config.prompt || null;

		if (is.string(promptContext)) {
			return this._changeContext(promptContext);
		}

		return Q.when(this._main.getFirstServiceUUID()).then(id => is.string(id) && this._changeContext(id));
	}

	/** Initialize command line interface*/
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

		/** Current custom commands */
		this._customCommands = {};

		this._updateCommands();

		return this._updateServiceCache().then( () => this._updatePrompt() ).then(() => this._runPrompt());
	}

	/** Update commands array */
	_updateCommands () {
		/** {Array.<String>} List of available commands */
		this._commands = this._getCommands();
	}

	/** */
	_runPrompt () {
		this._rl && this._rl.prompt();
	}

	/** Set command line prompt
	 * @param  value {string}
	 */
	_setPrompt (value) {
		debug.assert(value).is('string');
		this._rl && this._rl.setPrompt(value);
	}

	/** Get a path name from object in path */
	_getPathName (context) {
		return this._getType(context);
	}

	/** Returns current prompt based on context
	 * @returns {Array.<String>}
	 */
	_getPrompt () {
		return '[' + _.map(this._contextPath, path => this._getPathName(path)).join('/') + ']> ';
	}

	_updatePrompt () {
		this._setPrompt(this._getPrompt());
	}

	/** Uninitialize prompt */
	$onDestroy () {
		this._rl && this._rl.close();
	}

	/** */
	_onError (err) {
		debug.error(err);
	}

	/** Parse input line
	 * @param line {string}
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
			if (is.function(this[method])) {
				return Q.when(this[method](...argv));
			}

			// Custom commands
			if (_.has(this._customCommands, command) && is.function(this._customCommands[command])) {
				return Q.when(this._customCommands[command](...argv));
			}

			// Context commands
			const contextMethod = command;
			if (is.function(this._context[contextMethod])) {
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

	/** Returns list of commands available */
	_getCommands () {
		const customCommands = Object.keys(this._customCommands);

		const builtInCommands = _.filter(getAllKeys(this), key => key.startsWith('on')).map(key => key.substr(2).toLowerCase());

		const contextCommands = _.filter(getAllKeys(this._context), notPrivate);

		return _.concat(customCommands, builtInCommands, contextCommands);
	}

	/** Completer */
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

	/** Update internal cache for services */
	_updateServiceCache () {
		let newData = {};
		return this._ServiceCache.getUUIDs().then(
			uuids => Q.all(_.map(uuids,
				uuid =>  this._ServiceCache.get(uuid).then(service => newData[uuid] = service)
			))
		).then(() => this._services = newData);
	}

	/** Exit program */
	onExit () {

		// FIXME: Shutdown services.

		process.exit(0);
	}

	/** Alias for exit */
	onQuit () {
		return this.onExit();
	}

	/** Returns type as string */
	_getType (value) {
		if (is.array(value)) return 'array';
		if (is.object(value)) return _.get(value, 'constructor.name') || 'object';
		if (is.null(value)) return 'null';
		if (value === undefined) return 'undefined';

		const type = typeof value;
		return type;
	}

	/** Returns a value of key */
	__getValue (context, key) {
		return JSON.stringify(context[key]);
	}

	/** Returns a value of key */
	_getValue (context, key) {
		try {
			return this.__getValue(context, key);
		} catch (err) {
			return '!error ' + err;
		}
	}

	_getName (value) {
		return _.get(value, 'constructor.name');
	}

	/** Print context */
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

	/** */
	_changeContext (name) {

		if (is.object(name)) {
			this._contextPath = [name];
			this._context = name;
			return Q.all([
				Q.when(this._updatePrompt()),
				Q.when(this._updateCommands())
			]).then( () => {} );
		}

		if (is.string(name)) {
			return this._ServiceCache.get(name).then( obj => this._changeContext(obj) );
		}

		throw new TypeError("Unsupported context type: " + name);
	}

	/** Sample command */
	onEcho (...args) {
		console.log( args.map(arg => {
			if (arg === undefined) return 'undefined';
			return JSON.stringify(arg);
		}).join(', ') );
	}

	/** List all available contexts */
	onLs () {
		const contexts = Object.keys(this._services).map(
			serviceId => '[' + serviceId + '] ' + this._getName(this._services[serviceId])
		);

		console.log( contexts.map(context => '  ' + context).join('\n') )
	}

	/** Change to context */
	onCd (name) {
		debug.assert(name).is('string');
		return this.onContext(name);
	}

	/** Alias for cd */
	onUse (name) {
		return this.onCd(name);
	}

	/** Alias for cd */
	onChange (name) {
		return this.onCd(name);
	}

}