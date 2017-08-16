
import {
	Q,
	_,
	is,
	debug,
	moment,
	EventEmitter,
	parseFunctionArgumentNames
} from '../lib/index.js';

import uuidv4 from 'uuid/v4';

function __matchName (serviceName, s) {
	return s && (s.name === serviceName);
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

/** The service cache. All services available in a backend are registered into this cache. */
export default class ServiceCache extends EventEmitter {

	/** Event when a service registers into the cache
	 * @event ServiceCache#register
	 * @param {Object} Service instance
	 * @param {String} Service UUID
	 */

	/** Event when a service unregisters from the cache
	 * @event ServiceCache#unregister
	 * @param {Object} Service instance
	 * @param {String} Service UUID
	 */

	/** The constructor is called when the backend starts */
	constructor () {
		super();

		/** {Object.<String,InternalCacheObject>} */
		this._services = {};
	}

	/** */
	_existsFunction (service_) {
		return this._existsName(_.get(service_, 'constructor.name'));
	}

	/** */
	_existsName (service_) {
		const keys = Object.keys(this._services);
		return _.some(keys, id => __matchName(service_, this._services[id]) );
	}

	/** */
	_existsUUID (service_) {
		return _.has(this._services, service_);
	}

	/** */
	_exists (service_) {
		if (is.function(service_)) return this._existsFunction(service_);
		if (is.uuid(service_)) return this._existsUUID(service_);
		if (is.string(service_)) return this._existsName(service_);
	}

	/** Returns service name by UUID
	 * @param serviceId {String} The service UUID as a string
	 * @returns {String|undefined} The name of the service, otherwise undefined
	 */
	_getNameById (serviceId) {
		debug.assert(serviceId).is('uuid');
		return _.get(this._services, serviceId + '.name');
	}

	/** Returns the name of the service
	 * @param service {String|Function} Service as a function or a UUID (as string), or as a service name (as string).
	 * @returns {String|undefined} The name of the service, otherwise undefined
	 */
	_getName (service) {

		if (is.uuid(service)) {
			return this._getNameById(service);
		}

		if (is.string(service)) {
			return service;
		}

		if (is.function(service)) {
			return _.get(service, 'constructor.name');
		}
	}

	/** Returns all UUIDs for the service
	 * @param service {String|Function} Service as a function or a UUID (as string), or as a service name (as string).
	 * @returns {Array.<String>} Array of UUIDs for this service
	 */
	_getUUIDsForService (service) {

		if (is.function(service)) {
			service = _.get(service, 'constructor.name');
		}

		if (is.string(service)) {
			if (is.uuid(service)) return [service];
			return _.map(_.filter(this._services, s => s.name === service), s => s.id);
		}

		return [];
	}

	/** Wait until all dependencies exist
	 * @param service {Function} The service function. The function name will be used as a service name, and arguments as other dependencies.
	 * @returns {Promise} If promise is resolved successfully, the service is ready to be used.
	 */
	_waitInjectedServices (service) {
		return Q.Promise((resolve, reject) => {

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
				Q.fcall(() => {
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

				}).fail(err => {
					clearTimer();
					//debug.error(err);
					reject(err);
				}).done();
			};

			testLoop();

		});
	}

	/** Register a new service as a function. The function will be used as a constructor for the service instance.
	 * @param service {Function} The service function. The function name will be used as a service name, and arguments as other dependencies.
	 * @returns {String} The UUID of the registered service instance.
	 * @fires ServiceCache#register
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
	 */
	_getInstances (service) {
		const uuids = this._getUUIDsForService(service);
		//debug.log('uuids = ', uuids);
		return _.map(_.filter(uuids, uuid => _.has(this._services, uuid) && this._services[uuid].instance),
			uuid => this._services[uuid].instance
		);
	}

	/** Returns a list of registered service names. */
	_getNames () {
		return _.uniq(_.map(this._services, service => service.name));
	}

	/** Returns service instances by UUID, name or Function
	 * @param service {String|Function} Service as a function or a UUID (as string), or as a service name (as string).
	 * @returns {Array} Array of service instances
	 * @throws {Error} An error with message "Service not found: ..." if no services found
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
	 */
	_emitRegister(uuid) {
		this.emit('register', this._services[uuid], uuid);
	}

	/** Fires an event for unregistration
	 * @param {String} UUID
	 * @fires ServiceCache#unregister
	 */
	_emitUnregister(uuid) {
		this.emit('unregister', this._services[uuid], uuid);
	}

	/** Unregister services by UUID, name or function
	 * @param service {String|Function} Service as a function or a UUID (as string), or as a service name (as string).
	 * @returns {Object} Reference to this service for chaining.
	 * @fires ServiceCache#unregister
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
		return Q.when(s).then(service => {

			if (is.function(service)) {
				return this._waitInjectedServices(service).then( () => this._registerFunction(service) );
			}

			if (is.array(service)) {
				let uuids = [];
				return _.reduce(
					_.map(service, s => () => this.register(s).then(uuid => uuids.push(uuid))),
					(a, b) => a.then(b),
					Q()
				).then(() => uuids);
			}

			if (is.object(service)) {
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
		return Q.fcall(() => this._unregister(service));
	}

	/** Returns service name by UUID
	 * @param serviceId {String} The service UUID as a string
	 * @returns {Promise.<String|undefined>} The name of the service, otherwise undefined.
	 */
	getNameById (serviceId) {
		return Q.fcall(() => this._getNameById(serviceId));
	}

	/** Returns a single service instance by UUID, name or Function, asynchronously.
	 * @param service {String|Function} Service as a function or a UUID (as string), or as a service name (as string).
	 * @returns {Promise} The instance of service. It will be successful only if it is the only instance. Otherwise rejects as Errors.
	 * @rejects {Error} If no services found ("Service not found: ...").
	 * @rejects {Error} If multiple services available ("Multiple services found for ...")
	 */
	get (service) {
		return Q.fcall(() => this._get(service));
	}

	/** Returns service instances by UUID, name or Function
	 * @param service {String|Function} Service as a function or a UUID (as string), or as a service name (as string).
	 * @returns {Promise.<Array>} On successful resolve, an array of service instances, otherwise rejects as an Error.
	 * @rejects {Error} An error with message "Service not found: ..." if no services found
	 */
	getAll (service) {
		return Q.fcall(() => this._getAll(service));
	}

	/** Returns a list of registered service UUIDs
	 * @returns {Array.<String>} An array of UUID strings
	 */
	_getUUIDs () {
		return Object.keys(this._services);
	}

	/** Returns a list of registered service UUIDs
	 * @returns {Array.<String>} An array of UUID strings
	 */
	getUUIDs () {
		return Q.fcall(() => this._getUUIDs());
	}

	/** Configure service(s) by calling .$onConfig(config) on them. The service will only be configured if it it was unconfigured.
	 * @param service {String|Function} Service as a function or a UUID (as string), or as a service name (as string).
	 * @param config {Object}
	 */
	config (service, config) {
		return Q.fcall( () => {
			debug.assert(config).is('object');
			const uuids = this._getUUIDsForService(service);
			return Q.all(_.map(uuids, uuid => Q.fcall( () => {

				const serviceObj = this._services[uuid];

				const instance = serviceObj.instance;

				// Ignore if already configured
				if (serviceObj.isConfig) return;

				if (instance && is.function(instance.$onConfig)) {
					return Q.when(instance.$onConfig(config)).then(
						() => serviceObj.isConfig = true
					);
				}

				serviceObj.isConfig = true;

			})));
		} );
	}

	/** Configure all unconfigured services by calling .$onConfig(config) on them
	 * @param config {Object}
	 */
	configAll (config) {
		return Q.fcall(() => {
			debug.assert(config).is('object');
			const uuids = this._getUUIDs();
			return Q.all(_.map(uuids, uuid => this.config(uuid, config) ));
		});
	}

	/** Initialize uninitialized services by calling .$onInit() on them
	 * @param service {String|Function} Service as a function or a UUID (as string), or as a service name (as string).
	 * @param config {Object}
	 */
	init (service) {
		return Q.fcall( () => {
			const uuids = this._getUUIDsForService(service);
			return Q.all(_.map(uuids, uuid => Q.fcall( () => {

				const serviceObj = this._services[uuid];

				const instance = serviceObj.instance;

				if (!serviceObj.isConfig) throw new Error("Service has not been configured" + serviceObj.name + " ["+uuid+"]");

				// Ignore if already initialized
				if (serviceObj.isInit) return;

				if (instance && is.function(instance.$onInit)) {
					return Q.when(instance.$onInit()).then(
						() => serviceObj.isInit = true
					);
				}

				serviceObj.isInit = true;

			})));
		} );
	}

	/** Initialize all uninitialized services
	 * @param config {Object}
	 */
	initAll () {
		return Q.fcall(() => {
			const uuids = this._getUUIDs();
			return Q.all(_.map(uuids, uuid => this.init(uuid) ));
		});
	}

	/** Call .$onRun() on the service if has not been already configured successfully
	 * @param service {String|Function} Service as a function or a UUID (as string), or as a service name (as string).
	 * @param config {Object}
	 */
	run (service) {
		return Q.fcall( () => {
			const uuids = this._getUUIDsForService(service);
			return Q.all(_.map(uuids, uuid => Q.fcall( () => {

				const serviceObj = this._services[uuid];

				const instance = serviceObj.instance;

				if (!serviceObj.isInit) throw new Error("Service has not been initialized: " + serviceObj.name + " ["+uuid+"]");

				// Ignore if already rund
				if (serviceObj.isRun) return;

				if (instance && is.function(instance.$onRun)) {
					return Q.when(instance.$onRun()).then(
						() => serviceObj.isRun = true
					);
				}

				serviceObj.isRun = true;

			})));
		} );
	}

	/** Call .$onRun() on every service which has not been already configured successfully
	 * @param config {Object}
	 */
	runAll () {
		return Q.fcall(() => {
			const uuids = this._getUUIDs();
			return Q.all(_.map(uuids, uuid => this.run(uuid) ));
		});
	}

}
