/**
 * @module @sendanor/cloud-backend
 */

import {
	Async,
	_,
	is,
	debug
} from '../lib/index.js';

/** This is the application main service. It will handle service setup. Each service will first be constructed, then
 * called .$onConfig(), .$onInit() and finally .$onRun().
 *
 * @static
 */
class MainService {

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
	 * @param ServiceCache {Object|Function} The service instance or service
	 * function
	 * @returns {Object} Reference to itself for chaining
	 */
	setServiceCache (ServiceCache) {

		if (_.isFunction(ServiceCache)) {
			this._serviceCache = new ServiceCache();
			return this;
		}

		if (_.isObject(ServiceCache)) {
			this._serviceCache = ServiceCache;
			return this;
		}

		throw new TypeError("Invalid argument for MainService.setServiceCache(): " + ServiceCache);

	}

	/** Write to error log
	 *
	 * @param args
	 * @returns {MainService}
	 * @private
	 */
	_errorLog (err, ...args) {
		debug.log('Exception detected: ', err);
		if (this._log && this._log.error) {
			this._log.error(...args);
		} else {
			debug.error(...args);
		}
		return this;
	}

	/** Write to info log
	 *
	 * @param args
	 * @returns {MainService}
	 * @private
	 */
	_infoLog (...args) {
		if (this._log && this._log.info) {
			this._log.info(...args);
		} else {
			debug.info(...args);
		}
		return this;
	}

	/** Write to debug log
	 *
	 * @param args
	 * @returns {MainService}
	 * @private
	 */
	_debugLog (...args) {
		if (this._log && this._log.debug) {
			this._log.debug(...args);
		} else {
			debug.log(...args);
		}
		return this;
	}

	/** Register application services. Any service which has not been constructed, will be at this point.
	 * @returns {Promise} Reference to itself, for chaining.
	 */
	loadServices () {
		return Async.fcall( () => {

			debug.assert(this._builtInServices).is('array');
			debug.assert(this._userServices).is('array');

			//debug.log('this._builtInServices = ', this._builtInServices);
			//debug.log('this._userServices = ', this._userServices);

			const firstUserService = _.first(this._userServices);

			return this._serviceCache.register([this._serviceCache, this]).then(
				() => Async.all(_.concat(

					// Start up built in services
					_.map(this._builtInServices, Service => {
						debug.assert(Service).is('defined');
						return this._serviceCache.register(Service);
					}),

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
				() => Async.all([
					this._serviceCache.get('LogService').then(logService => this._log = logService)
					//this._serviceCache.get('RequestService').then(requestService => this._request = requestService)
				])
			).then(() => this._debugLog('[main] All services created.'))

		}).catch(
			err => this._errorLog(err, 'Failed to create some services: ' + ((err && err.message) || ''+err) )
		);
	}

	/** Configure services and call .$onConfig(config) on each service.
	 * @param config {Object} Configuration options from command line
	 */
	configServices (config) {
		return this._serviceCache.configAll(config).then(
			() => this._debugLog('[main] All services configured.')
		).catch(err => {
			this._errorLog(err, 'Failed to configure some services: ' + ((err && err.message) || ''+err));
			return Async.reject(err);
		});
	}

	/** Initialize services and call .$onInit() on each service. */
	initServices () {
		return this._serviceCache.initAll().then(
			() => this._debugLog('[main] All services initialized.')
		).catch(err => {
			this._errorLog(err, 'Failed to initialize some services: ' + ((err && err.message) || ''+err));
			return Async.reject(err);
		});
	}

	/** Call .$onRun() on each service to tell all services are running
	 *
	 */
	runServices () {
		return this._serviceCache.runAll().then(
			() => this._infoLog('[main] All services running.')
		).catch(err => {
			this._errorLog(err,'Failed to call run on some services: ' + ((err && err.message) || ''+err));
			return Async.reject(err);
		});
	}

}

export default MainService;