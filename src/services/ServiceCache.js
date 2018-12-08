/**
 * @module @sendanor/cloud-backend
 */

import {
	Async
	, _
	, debug
	, moment
	, EventEmitter
	, parseFunctionArgumentNames
	, isUUID
} from '../lib/index.js';

import uuidv4 from 'uuid/v4';

function __matchName (serviceName, s) {
	debug.assert(serviceName).is('string');
	debug.assert(s).is('object');
	debug.assert(s.name).is('string');

	return s.name === serviceName;
}

/**
 * @typedef InternalCacheObject
 * @type {object}
 * @property id {string} The UUID
 * @property name {string} The service name
 * @property instance {object} The instance of the service
 * @property isConfig {boolean} True if $onConfig() has been called
 * @property isInit {boolean} True if $onInit() has been called
 * @property isRun {boolean} True if $onRun() has been called
 */

/** The service cache. All services available in a backend are registered into this cache.
 * @class
 * @extends EventEmitter
 * @static
 */
class ServiceCache extends EventEmitter {

	/** Event when a service registers into the cache
	 * @memberOf module:@sendanor/cloud-backend
	 * @event ServiceCache#register
	 * @param {Object} Service instance
	 * @param {String} Service UUID
	 */

	/** Event when a service unregisters from the cache
	 * @memberOf module:@sendanor/cloud-backend
	 * @event ServiceCache#unregister
	 * @param {Object} Service instance
	 * @param {String} Service UUID
	 */

	/** The constructor is called when the backend starts
	 */
	constructor () {

		super();

		/** @member {Object.<String,InternalCacheObject>} */
		this._services = {};
	}

	/** Returns true if a function (with the same name) exists in the cache.
	 * @param service_ {function}
	 * @returns {boolean}
	 * @private
	 */
	_existsFunction (service_) {
		debug.assert(service_).is('function');
		return this._existsName(_.get(service_, 'constructor.name'));
	}

	/** Returns true if a service with this name exists in the cache.
	 * @param service_ {string} The service name
	 * @returns {boolean}
	 * @private
	 */
	_existsName (service_) {
		debug.assert(service_).is('string');
		const keys = Object.keys(this._services);
		return _.some(keys, id => __matchName(service_, this._services[id]) );
	}

	/** Returns true if a service with this UUID exists in the cache.
	 * @param service_ {string} The UUID of the service
	 * @returns {boolean}
	 * @private
	 */
	_existsUUID (service_) {
		debug.assert(service_).is('uuid');
		return _.has(this._services, service_);
	}

	/** Returns true if this service exists in the cache.
	 * @param service_ {string|function} A service function, UUID or name.
	 * @returns {boolean}
	 * @private
	 */
	_exists (service_) {
		if (_.isFunction(service_)) return this._existsFunction(service_);
		if (isUUID(service_)) return this._existsUUID(service_);
		if (_.isString(service_)) return this._existsName(service_);
	}

	/** Returns service name by UUID
	 * @param serviceId {String} The service UUID as a string
	 * @returns {String|undefined} The name of the service, otherwise undefined
	 * @private
	 */
	_getNameById (serviceId) {
		debug.assert(serviceId).is('uuid');
		return _.get(this._services, serviceId + '.name');
	}

	/** Returns the name of the service
	 * @param service {String|Function} Service as a function or a UUID (as string), or as a service name (as string).
	 * @returns {String|undefined} The name of the service, otherwise undefined
	 * @private
	 */
	_getName (service) {

		if (isUUID(service)) {
			return this._getNameById(service);
		}

		if (_.isString(service)) {
			return service;
		}

		if (_.isFunction(service)) {
			return _.get(service, 'constructor.name');
		}

	}

	/** Returns all UUIDs for the service
	 * @param service {String|Function} Service as a function or a UUID (as string), or as a service name (as string).
	 * @returns {Array.<String>} Array of UUIDs for this service
	 * @private
	 */
	_getUUIDsForService (service) {

		if (_.isFunction(service)) {
			service = _.get(service, 'constructor.name');
		}

		if (_.isString(service)) {
			if (isUUID(service)) return [service];
			return _.map(_.filter(this._services, s => s.name === service), s => s.id);
		}

		return [];
	}

	/** Wait until all dependencies exist
	 * @param service {Function} The service function. The function name will be used as a service name, and arguments as other dependencies.
	 * @returns {Promise.<undefined>} If promise is resolved successfully, the service is ready to be used.
	 * @private
	 */
	_waitInjectedServices (service) {
		return Async.Promise((resolve, reject) => {

			debug.assert(service).is('function');

			let loops = 0;
			const maxLoops = 10;
			const maxWaitTime = 60*1000;
			let waitTime = 1000;

			const name = _.get(service, 'name');

			const args = parseFunctionArgumentNames(service);
			debug.assert(args).is('array');

			//debug.log('name = ', name);
			//debug.log('args = ', args);

			let timer;

			const clearTimer = () => {
				if (timer) {
					clearTimeout(timer);
					timer = undefined;
				}
			};

			const testLoop = () => {
				Async.done(Async.fcall(() => {
					//debug.log('Looping... args =', args);

					clearTimer();

					const hasAllServices = _.every(args, name => this._existsName(name));

					//debug.log('hasAllServices = ', hasAllServices);

					if (hasAllServices) {
						resolve();
						return;
					}

					timer = setTimeout(testLoop, waitTime);

					const missingServices = _.filter(args, name => !this._existsName(name));

					if (missingServices.length === 1) {
						console.log(moment().format() + ' [ServiceCache] No service ' + missingServices.join(', ') + ' for '+name+'. Waiting '+(waitTime/1000)+' s.');
					} else {
						console.log(moment().format() + ' [ServiceCache] Some services missing (' + missingServices.join(', ') + ') for '+name+'. Waiting '+(waitTime/1000)+' s.');
					}

					loops += 1;

					waitTime *= 2;
					if (waitTime >= maxWaitTime) {
						throw new Error("Some dependencies for "+name+" failed to start: " + missingServices.join(', ') );
					}

					if (loops >= maxLoops) {
						throw new Error("Some dependencies for "+name+" failed to start: " + missingServices.join(', ') );
					}

				}).catch(err => {
					clearTimer();
					//debug.error(err);
					reject(err);
				}));
			};

			testLoop();

		});
	}

	/** Register a new service as a function. The function will be used as a constructor for the service instance.
	 * @param service {Function} The service function. The function name will be used as a service name, and arguments as other dependencies.
	 * @returns {String} The UUID of the registered service instance.
	 * @fires ServiceCache#register
	 * @private
	 */
	_registerFunction (service) {
		debug.assert(service).is('function');
		//debug.log('service = ', service);
		const serviceName = _.get(service, 'name');
		const uuid = uuidv4();
		const args = parseFunctionArgumentNames(service);
		const injectedServices = _.map(args, name => this._get(name));

		const instance = new service(...injectedServices);

		//debug.log('instance = ', instance);

		this._services[uuid] = {
			id: uuid,
			name: serviceName,
			instance,
			isConfig: false,
			isInit: false,
			isRun: false
		};
		console.log(moment().format() + ' [ServiceCache] Registered ' + serviceName + ' with UUID ' + uuid);
		this._emitRegister(uuid);
		return uuid;
	}

	/** Register a new service from an instance of service
	 * @param service {Object} An instance of the service
	 * @returns {String} The UUID of the registered service instance.
	 * @fires ServiceCache#register
	 * @private
	 */
	_registerInstance (service) {
		debug.assert(service).is('object');

		//debug.log('service = ', service);

		//const serviceConstructor = _.get(service, 'constructor');
		//debug.assert(serviceConstructor).is('function');
		const serviceName = _.get(service, 'constructor.name');
		const uuid = uuidv4();

		this._services[uuid] = {
			id: uuid,
			name: serviceName,
			instance: service,
			isConfig: false,
			isInit: false,
			isRun: false
		};

		console.log(moment().format() + ' [ServiceCache] Registered ' + serviceName + ' with UUID ' + uuid);
		this._emitRegister(uuid);
		return uuid;
	}

	/** Returns service instances by UUID, name or Function
	 * @param service {String|Function} Service as a function or a UUID (as string), or as a service name (as string).
	 * @returns {Array} Array of service instances
	 * @private
	 */
	_getInstances (service) {
		const uuids = this._getUUIDsForService(service);
		//debug.log('uuids = ', uuids);
		return _.map(_.filter(uuids, uuid => _.has(this._services, uuid) && this._services[uuid].instance),
			uuid => this._services[uuid].instance
		);
	}

	/** Returns a list of registered service names.
	 * @returns {Array.<string>} All service names registered.
	 * @private
	 */
	_getNames () {
		return _.uniq(_.map(this._services, service => service.name));
	}

	/** Returns service instances by UUID, name or Function
	 * @param service {String|Function} Service as a function or a UUID (as string), or as a service name (as string).
	 * @returns {Array} Array of service instances
	 * @throws {Error} An error with message "Service not found: ..." if no services found
	 * @private
	 */
	_getAll (service) {
		const services = this._getInstances(service);
		if (services.length === 0) {
			throw new Error("Service not found: " + this._getName(service));
		}
		return services;
	}

	/** Returns a single service instance by UUID, name or Function, synchronously.
	 * @param service {String|Function} Service as a function or a UUID (as string), or as a service name (as string).
	 * @returns {*} The instance of service. This will be returned only if it is the only instance.
	 * @throws {Error} If no services found ("Service not found: ...").
	 * @throws {Error} If multiple services available ("Multiple services found for ...")
	 * @private
	 */
	_get (service) {
		const services = this._getInstances(service);
		const l = services.length;

		if (l === 1) return _.first(services);

		const name = this._getName(service)
		if (l === 0) throw new TypeError("Service not found: " + name);
		throw new Error("Multiple services found for " + name);
	}

	/** Fires an event for registration
	 * @param {String} UUID
	 * @fires ServiceCache#register
	 * @returns {undefined}
	 * @private
	 */
	_emitRegister (uuid) {
		this.emit('register', this._services[uuid], uuid);
	}

	/** Fires an event for unregistration
	 * @param {String} UUID
	 * @fires ServiceCache#unregister
	 * @returns {undefined}
	 * @private
	 */
	_emitUnregister (uuid) {
		this.emit('unregister', this._services[uuid], uuid);
	}

	/** Unregister services by UUID, name or function
	 * @param service {String|Function} Service as a function or a UUID (as string), or as a service name (as string).
	 * @fires ServiceCache#unregister
	 * @returns {Object} Reference to this service for chaining.
	 * @private
	 */
	_unregister (service) {
		const uuids = this._getUUIDsForService(service);
		_.forEach(uuids, uuid => {
			if (this._exists(uuid)) {
				this._emitUnregister(this._services[uuid], uuid);
				delete this._services[uuid];
			}
		});
		return this;
	}

	/** Register a new service
	 * @param service {Object|Function|Array.<Object|Function>|Promise} The service instance, a service function, or an array of them.
	 * @returns {Promise.<String|Array.<String>>} The UUID of the registered service, or an array of UUIDs if the argument was an array.
	 */
	register (s) {
		return Async.resolve(s).then(service => {

			if (_.isFunction(service)) {
				return this._waitInjectedServices(service).then( () => this._registerFunction(service) );
			}

			if (_.isArray(service)) {
				let uuids = [];
				return _.reduce(
					_.map(service, s => () => this.register(s).then(uuid => uuids.push(uuid))),
					(a, b) => a.then(b),
					Async.resolve()
				).then(() => uuids);
			}

			if (_.isObject(service)) {
				return this._registerInstance(service);
			}

			throw new TypeError("ServiceCache.register() called with invalid argument: " + service);

		});
	}

	/** Unregister services by UUID, name or function
	 * @param service {String|Function} Service as a function or a UUID (as string), or as a service name (as string).
	 * @returns {Promise.<Object>} A promise of unregistration: Successful unregistering will result to reference to
	 * this service instance, for chaining.
	 */
	unregister (service) {
		return Async.fcall(() => this._unregister(service));
	}

	/** Register and load a new service
	 * @param service {String|Function} Service as a function or a UUID (as string), or as a service name (as string).
	 * @returns {Promise} The instance of service. It will be successful only if it is the only instance. Otherwise rejects as Errors.
	 */
	load (s) {
		return this.register(s).then(
			uuid => this.get(uuid)
		);
	}

	/** Returns service name by UUID
	 * @param serviceId {String} The service UUID as a string
	 * @returns {Promise.<String|undefined>} The name of the service, otherwise undefined.
	 */
	getNameById (serviceId) {
		return Async.fcall(() => this._getNameById(serviceId));
	}

	/** Returns a single service instance by UUID, name or Function, asynchronously.
	 * @param service {String|Function} Service as a function or a UUID (as string), or as a service name (as string).
	 * @returns {Promise} The instance of service. It will be successful only if it is the only instance. Otherwise rejects as Errors.
	 * @rejects {Error} If no services found ("Service not found: ...").
	 * @rejects {Error} If multiple services available ("Multiple services found for ...")
	 */
	get (service) {
		return Async.fcall(() => this._get(service));
	}

	/** Returns service instances by UUID, name or Function
	 * @param service {String|Function} Service as a function or a UUID (as string), or as a service name (as string).
	 * @returns {Promise.<Array>} On successful resolve, an array of service instances, otherwise rejects as an Error.
	 * @rejects {Error} An error with message "Service not found: ..." if no services found
	 */
	getAll (service) {
		return Async.fcall(() => this._getAll(service));
	}

	/** Returns a list of registered service UUIDs
	 * @returns {Array.<String>} An array of UUID strings
	 * @private
	 */
	_getUUIDs () {
		return Object.keys(this._services);
	}

	/** Returns a list of registered service UUIDs
	 * @returns {Array.<String>} An array of UUID strings
	 */
	getUUIDs () {
		return Async.fcall(() => this._getUUIDs());
	}

	/** Configure a internal service object
	 * @param serviceObj {Object} Internal service cache object
	 * @returns {Promise}
	 * @private
	 */
	_config (serviceObj, config) {

		debug.assert(serviceObj).is('object');

		// Ignore if already configured
		if (serviceObj.isConfig) return Async.resolve();
		if (serviceObj.isConfiguring) return Async.resolve(serviceObj.isConfiguring);

		const instance = serviceObj.instance;

		if (instance && _.isFunction(instance.$onConfig)) {
			//debug.log('calling .$onConfig()... serviceObj = ', serviceObj);
			return serviceObj.isConfiguring = Async.resolve(instance.$onConfig(config)).then(
				() => {
					serviceObj.isConfig = true;
					serviceObj.isConfiguring = undefined;
					console.log(moment().format() + ' [ServiceCache] Configured ' + serviceObj.name + ' with UUID ' + serviceObj.id);
				}
			);
		}

		serviceObj.isConfig = true;
		console.log(moment().format() + ' [ServiceCache] Configured ' + serviceObj.name + ' with UUID ' + serviceObj.id);

		return Async.resolve();
	}

	/** Configure service(s) by calling .$onConfig(config) on them. The service will only be configured if it it was unconfigured.
	 * @param service {String|Function} Service as a function or a UUID (as string), or as a service name (as string).
	 * @param config {Object}
	 * @returns {Promise.<undefined>}
	 */
	config (service, config) {
		return Async.fcall( () => {
			debug.assert(config).is('object');
			const uuids = this._getUUIDsForService(service);
			return Async.all(_.map(uuids, uuid => Async.fcall( () => {
				const serviceObj = this._services[uuid];
				return this._config(serviceObj, config);
			})));
		} ).then( () => {} );
	}

	/** Configure all unconfigured services by calling .$onConfig(config) on them
	 * @param config {Object}
	 * @returns {Promise.<undefined>}
	 */
	configAll (config) {
		return Async.fcall(() => {
			debug.assert(config).is('object');

			// Configure services which are unconfigured
			return Async.all(
				_.map(
					_.filter(
						_.map(
							_.keys(this._services),
							uuid => this._services[uuid]
						),
						serviceObj => serviceObj.isConfig ? false : !(serviceObj.isConfiguring)
					),
					serviceObj => this._config(serviceObj, config)
				)
			);

		}).then( () => {

			// Check if some services are still unconfigured (probably created by other config functions)
			const unconfigured = _.filter(
				_.map(
					_.keys(this._services),
					uuid => this._services[uuid]
				),
				serviceObj => serviceObj.isConfig ? false : !(serviceObj.isConfiguring)
			);

			if (unconfigured.length) {
				return this.configAll(config);
			}

		} ).then( () => {} );
	}

	/** Initialize uninitialized services by calling .$onInit() on them
	 * @param service {String|Function} Service as a function or a UUID (as string), or as a service name (as string).
	 * @returns {Promise}
	 */
	init (service) {
		return Async.fcall( () => {
			const uuids = this._getUUIDsForService(service);
			return Async.all(_.map(uuids, uuid => Async.fcall( () => {

				const serviceObj = this._services[uuid];

				if (!serviceObj.isConfig) {
					throw new Error("Service has not been configured: " + serviceObj.name + " ["+uuid+"]");
				}

				// Ignore if already initialized
				if (serviceObj.isInit) return;

				const instance = serviceObj.instance;

				if (instance && _.isFunction(instance.$onInit)) {
					return Async.resolve(instance.$onInit()).then(
						() => {
							serviceObj.isInit = true;
							console.log(moment().format() + ' [ServiceCache] Inititialized ' + serviceObj.name + ' with UUID ' + serviceObj.id);
						}
					);
				}

				serviceObj.isInit = true;
				console.log(moment().format() + ' [ServiceCache] Inititialized ' + serviceObj.name + ' with UUID ' + serviceObj.id);

			})));
		} ).then( () => {} );
	}

	/** Initialize all uninitialized services
	 * @returns {Promise}
	 */
	initAll () {
		return Async.fcall(() => {
			const uuids = this._getUUIDs();
			return Async.all(_.map(uuids, uuid => this.init(uuid) ));
		}).then( () => {} );
	}

	/** Call .$onRun() on the service if has not been already configured successfully
	 * @param service {String|Function} Service as a function or a UUID (as string), or as a service name (as string).
	 * @returns {Promise}
	 */
	run (service) {
		return Async.fcall( () => {
			const uuids = this._getUUIDsForService(service);
			return Async.all(_.map(uuids, uuid => Async.fcall( () => {

				const serviceObj = this._services[uuid];

				const instance = serviceObj.instance;

				if (!serviceObj.isInit) throw new Error("Service has not been initialized: " + serviceObj.name + " ["+uuid+"]");

				// Ignore if already rund
				if (serviceObj.isRun) return;

				if (instance && _.isFunction(instance.$onRun)) {
					return Async.resolve(instance.$onRun()).then(
						() => {
							serviceObj.isRun = true;
							console.log(moment().format() + ' [ServiceCache] Service ' + serviceObj.name + ' running with UUID ' + serviceObj.id);
						}
					);
				}

				serviceObj.isRun = true;
				console.log(moment().format() + ' [ServiceCache] Service ' + serviceObj.name + ' running with UUID ' + serviceObj.id);

			})));
		} ).then( () => {} );
	}

	/** Call .$onRun() on every service which has not been already configured successfully
	 * @returns {Promise}
	 */
	runAll () {
		return Async.fcall(() => {
			const uuids = this._getUUIDs();
			return Async.all(_.map(uuids, uuid => this.run(uuid) ));
		}).then( () => {} );
	}

}

export default ServiceCache;