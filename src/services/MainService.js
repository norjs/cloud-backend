import {
	Q,
	_,
	is,
	debug
} from '../lib/index.js';

/** This is the application main service. It will handle service setup. Each service will first be constructed, then called .$onConfig(), .$onInit() and finally .$onRun().  */
export default class MainService {

	constructor () {
		this._log = undefined;
		this._serviceCache = undefined;
		this._firstServiceUUID = undefined;
		this._builtInServices = [];
		this._userServices = [];
	}

	/** Returns the log service */
	getLog () {
		if (!this._log) throw new Error("MainService's Log was not set yet.");
		return this._log;
	}

	/** Returns the log service */
	getFirstServiceUUID () {
		return this._firstServiceUUID;
	}

	/** Set built-in services
	 * @param services {Array.<Function|Object>} Array of service functions or instances
	 * @returns {Object} Reference to itself for chaining
	 */
	setBuiltInServices (services) {
		debug.assert(services).is('array');
		this._builtInServices = _.concat([], services);
		return this;
	}

	/** Set user defined services
	 * @param services {Array.<Function|Object>} Array of service functions or instances
	 * @returns {Object} Reference to itself for chaining
	 */
	setUserServices (services) {
		debug.assert(services).is('array');
		this._userServices = _.concat([], services);
		return this;
	}

	/** Set the service cache
	 * @param serviceCache {Object|Function} The service instance or service function
	 * @returns {Object} Reference to itself for chaining
	 */
	setServiceCache (ServiceCache) {

		if (is.function(ServiceCache)) {
			this._serviceCache = new ServiceCache();
			return this;
		}

		if (is.object(ServiceCache)) {
			this._serviceCache = ServiceCache;
			return this;
		}

		throw new TypeError("Invalid argument for MainService.setServiceCache(): " + ServiceCache);

	}

	/** Write to error log */
	_errorLog (...args) {
		const f = this._log && is.function(this._log.error) ? this._log.error : debug.error;
		f(...args);
		return this;
	}

	/** Write to info log */
	_infoLog (...args) {
		const f = this._log && is.function(this._log.error) ? this._log.info : debug.info;
		f(...args);
		return this;
	}

	/** Register application services. Any service which has not been constructed, will be at this point.
	 * @returns {Promise} Reference to itself, for chaining.
	 */
	loadServices () {
		return Q.fcall( () => {

			debug.assert(this._builtInServices).is('array');
			debug.assert(this._userServices).is('array');

			const firstUserService = _.first(this._userServices);

			return this._serviceCache.register([this._serviceCache, this]).then(
				() => Q.all(_.concat(

					// Start up built in services
					_.map(this._builtInServices, Service => this._serviceCache.register(Service)),

					// Start up user defined services
					_.map(this._userServices, Service => {
						debug.assert(Service).is('defined');
						return this._serviceCache.register(Service).then(uuid => {
							if (Service === firstUserService) {
								this._firstServiceUUID = uuid;
							}
							return uuid;
						});
					})
				))
			).then(
				() => Q.all([
					this._serviceCache.get('LogService').then(logService => this._log = logService)
					//this._serviceCache.get('RequestService').then(requestService => this._request = requestService)
				])
			).then(() => this._infoLog('[main] All services started.'))

		}).fail(
			err => this._errorLog('Failed to start some services: ' + ((err && err.message) || ''+err) )
		);
	}

	/** Configure services and call .$onConfig(config) on each service.
	 * @param config {Object} Configuration options from command line
	 */
	configServices (config) {
		return this._serviceCache.configAll(config).then(
			() => this._infoLog('[main] All services configured.')
		).fail(err => {
			this._errorLog('Failed to configure some services: ' + ((err && err.message) || ''+err));
			return Q.reject(err);
		});
	}

	/** Initialize services and call .$onInit() on each service. */
	initServices () {
		return this._serviceCache.initAll().then(
			() => this._infoLog('[main] All services initialized.')
		).fail(err => {
			this._errorLog('Failed to initialize some services: ' + ((err && err.message) || ''+err));
			return Q.reject(err);
		});
	}

	/** Call .$onRun() on each service to tell all services are running */
	runServices () {
		return this._serviceCache.runAll().then(
			() => this._infoLog('[main] All services running.')
		).fail(err => {
			this._errorLog('Failed to call run on some services: ' + ((err && err.message) || ''+err));
			return Q.reject(err);
		});
	}

}
