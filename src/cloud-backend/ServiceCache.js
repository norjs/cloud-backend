import _ from 'lodash';
import Service from './Service';
import is from 'nor-is';
import debug from 'nor-debug';
import uuidv4 from 'uuid/v4';

export default class ServiceCache extends Service {

	/** The constructor is called when the backend starts */
	constructor () {
		super();
		this._services = {};
	}

	/** */
	exists (service_) {

		if (is.function(service_)) {
			service_ = _.get(service_, 'constructor.name');
		}

		if (is.uuid(service_)) {
			return this._services.hasOwnProperty(service_);
		}

		if (is.string(service_)) {
			return _.some(this._services, service => service.name === service_);
		}

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

	/** Returns the name of the service */
	_getUUIDs (service_) {

		if (is.uuid(service_)) {
			return service_;
		}

		if (is.function(service_)) {
			service_ = _.get(service_, 'constructor.name');
		}

		if (is.string(service_)) {
			return _.filter(this._services, service => service.name === service_).map(service => service.id);
		}

		return [];
	}

	/** Register a new service as function */
	_registerFunction (service_) {
		debug.assert(service_).is('function');
		//debug.log('service_ = ', service_);
		const serviceName = _.get(service_, 'name');
		const uuid = uuidv4();
		this._services[uuid] = {
			id: uuid,
			name: serviceName,
			//type: service_,
			instance: new service_()
		};
		console.log('[ServiceCache] Registered ' + serviceName + ' with UUID ' + uuid);
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
		console.log('[ServiceCache] Registered ' + serviceName + ' with UUID ' + uuid);
		return uuid;
	}

	/** Register a new service */
	register (service_) {
		if (is.object(service_)) {
			return this._registerInstance(service_);
		}
		return this._registerFunction(service_);
	}

	/** Unregister services by UUID, name or function
	 * @param service_ {uuid|name|Function}
	 */
	unregister (service_) {
		const uuids = this._getUUIDs(service_);
		_.forEach(uuids, uuid => {
			if (this.exists(uuid)) {
				delete this._services[uuid];
			}
		});
		return this;
	}

	/** Returns service instance by name or Function */
	_getInstances (service_) {
		const uuids = this._getUUIDs(service_);
		return _.map(uuids, uuid => this._services.hasOwnProperty(uuid) && this._services[uuid].instance);
	}

	/** Returns service instance by name or Function */
	getNameById (serviceId) {
		debug.assert(serviceId).is('uuid');
		return _.get(this._services[serviceId], 'name');
	}

	/** Returns service instance by name */
	get (service_) {
		const services = this._getInstances(service_);

		if (services.length === 0) {
			throw new TypeError("Service(s) not found: " + this.getName(service_));
		}

		if (services.length === 1) {
			return _.first(services);
		}

		return services;
	}

	/** Returns a list of registered service UUIDs */
	getUUIDs () {
		return Object.keys(this._services);
	}

	/** Returns a list of registered service names. */
	getNames () {
		return _.uniq(_.map(this._services, service => service.name));
	}

}
