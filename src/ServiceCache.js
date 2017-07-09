import Q from 'q';
import _ from 'lodash';
import Service from './Service';
import is from 'nor-is';
import debug from 'nor-debug';
import uuidv4 from 'uuid/v4';
import moment from 'moment';
import { parseFunctionArgumentNames } from './helpers.js';

export default class ServiceCache extends Service {

	/** The constructor is called when the backend starts */
	constructor () {
		super();
		this._services = {};
	}

	/** */
	_existsFunction (service_) {
		return this._existsName(_.get(service_, 'constructor.name'));
	}

	/** */
	_existsName (service_) {
		//debug.log("service_ =", service_);
		const keys = Object.keys(this._services);
		//debug.log("keys =", keys);
		return _.some(keys, id => {
			//debug.log('s = ', s);
			const s = this._services[id];
			return s && (s.name === service_);
		});
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

	/** Returns the name of the service */
	_getName (service_) {
		if (is.string(service_)) {
			return service_;
		}

		if (is.function(service_)) {
			return _.get(service_, 'constructor.name');
		}
	}

	/** Returns all UUIDs for the service */
	_getUUIDs (service_) {

		if (is.uuid(service_)) {
			return [service_];
		}

		if (is.function(service_)) {
			service_ = _.get(service_, 'constructor.name');
			//debug.log('service_ = ', service_);
		}

		if (is.string(service_)) {
			return _.map(_.filter(this._services, service => service.name === service_), service => service.id);
		}

		return [];
	}

	/** Wait until all dependencies exist */
	_waitInjectedServices (service_) {
		return Q.Promise((resolve, reject) => {
			debug.assert(service_).is('function');

			let loops = 0;
			const maxLoops = 10;
			const maxWaitTime = 60*1000;
			let waitTime = 1000;

			const name = _.get(service_, 'name');

			const args = parseFunctionArgumentNames(service_);
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

	/** Register a new service as function */
	_registerFunction (service_) {
		debug.assert(service_).is('function');
		//debug.log('service_ = ', service_);
		const serviceName = _.get(service_, 'name');
		const uuid = uuidv4();
		const args = parseFunctionArgumentNames(service_);
		const injectedServices = _.map(args, name => this._get(name));

		const instance = new service_(...injectedServices);

		this._services[uuid] = {
			id: uuid,
			name: serviceName,
			//type: service_,
			instance
		};

		console.log(moment().format() + ' [ServiceCache] Registered ' + serviceName + ' with UUID ' + uuid);
		return uuid;
	}

	/** Register a new service from an instance */
	_registerInstance (service_) {
		debug.assert(service_).is('object');

		//debug.log('service_ = ', service_);

		//const serviceConstructor = _.get(service_, 'constructor');
		//debug.assert(serviceConstructor).is('function');
		const serviceName = _.get(service_, 'constructor.name');
		const uuid = uuidv4();

		this._services[uuid] = {
			id: uuid,
			name: serviceName,
			//type: serviceConstructor,
			instance: service_
		};
		console.log(moment().format() + ' [ServiceCache] Registered ' + serviceName + ' with UUID ' + uuid);
		return uuid;
	}

	/** Returns service instance by name or Function */
	_getInstances (service_) {
		const uuids = this._getUUIDs(service_);
		//debug.log('uuids = ', uuids);
		return _.map(_.filter(uuids, uuid => _.has(this._services, uuid) && this._services[uuid].instance), uuid => this._services[uuid].instance);
	}

	/** Returns a list of registered service names. */
	_getNames () {
		return _.uniq(_.map(this._services, service => service.name));
	}


	/** Register a new service */
	register (service_) {
		return Q.fcall(() => {
			if (is.object(service_)) {
				return this._registerInstance(service_);
			}

			//debug.log('Waiting services... service_ = ', service_);
			return this._waitInjectedServices(service_).then(() => {
				//debug.log('Services found!');
				return this._registerFunction(service_);
			});
		});
	}

	/** Unregister services by UUID, name or function
	 * @param service_ {uuid|name|Function}
	 */
	unregister (service_) {
		return Q.fcall(() => {
			const uuids = this._getUUIDs(service_);
			_.forEach(uuids, uuid => {
				if (this._exists(uuid)) {
					delete this._services[uuid];
				}
			});
			return this;
		});
	}

	/** Returns service name by UUID */
	getNameById (serviceId) {
		return Q.fcall(() => {
			debug.assert(serviceId).is('uuid');
			return _.get(this._services[serviceId], 'name');
		});
	}

	/** Returns service instance by name, synchronously */
	_get (service_) {
		const services = this._getInstances(service_);

		if (services.length === 0) {
			throw new TypeError("Service not found: " + this._getName(service_));
		}

		if (services.length === 1) {
			return _.first(services);
		}

		throw new Error("Multiple services found for " + this._getName(service_));
	}

	/** Returns service instance by name */
	get (service_) {
		return Q.fcall(() => this._get(service_));
	}

	/** Returns service instance by name */
	getAll (service_) {
		return Q.fcall(() => {

			const services = this._getInstances(service_);

			if (services.length === 0) {
				throw new TypeError("Service not found: " + this._getName(service_));
			}

			return services;
		});
	}

	/** Returns a list of registered service UUIDs */
	getUUIDs () {
		return Q.fcall(() => {
			return Object.keys(this._services);
		});
	}

}
