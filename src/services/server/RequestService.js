/**
 * @module @sendanor/cloud-backend
 */

import {
	Q,
	_,
	debug
} from '../../lib/index.js';

/** A core service to handle backend HTTP(s) requests using other smaller services which register to this one
 *
 * @static
 */
class RequestService {

	constructor (ServiceCache) {

		this._serviceCache = ServiceCache;

		/** @member {Array.<Object>} Each service which has been registered with this service to handle requests */
		this._services = [];

		/** @member {Function} Pre-built function to call for each request with {object} req, {object} res and {Function} next */
		this._requestHandler = () => {};

	}

	/** Register a service to handle requests
	 * @param service {Object} An object with a $onRequest method to handle requests.
	 * @returns {Object} Reference to itself for chaining.
	 * @private
	 */
	_register (service) {
		debug.assert(service).is('object');
		debug.assert(service.$onRequest).is('function');
		this._services.push(service);
		this._buildRequestHandler();
		return this;
	}

	/** Unregister a service
	 * @param service {Object} An object with a $onRequest method to handle requests.
	 * @returns {Object} Reference to itself for chaining.
	 * @private
	 */
	_unregister (service) {
		debug.assert(service).is('object');
		debug.assert(service.$onRequest).is('function');
		_.remove(this._services, s => s === service);
		this._buildRequestHandler();
		return this;
	}

	/** Register a service to handle requests
	 * @param service {Object} An object with a $onRequest method to handle requests.
	 * @returns {Promise.<Object>} Reference to itself for chaining.
	 */
	register (service) {
		return Q.fcall( () => this._register(service) );
	}

	/** Unregister a service
	 * @param service {Object} An object with a $onRequest method to handle requests.
	 * @returns {Promise.<Object>} Reference to itself for chaining.
	 */
	unregister (service) {
		return Q.fcall( () => this._unregister(service) );
	}

	/** Builds a single request handler function from multiple request handlers
	 * @returns {Array.<Function>}
	 * @private
	 */
	_buildRequestHandler () {
		return this._requestHandler = _.reduce(
			_.map(
				this._services,
				service => (req, res, next) => {
					debug.assert(req).is('object');
					debug.assert(res).is('object');
					debug.assert(next).is('function');
					debug.assert(service).is('object');
					debug.assert(service.$onRequest).is('function');
					return service.$onRequest(req, res, next);
				}
			),
			(a, b) => (req, res, next) => a(req, res, err => {
				if (err) throw err;
				return b(req, res, err2 => {
					if (err2) throw err2;
					return next();
				});
			})
		);
	}

	/** Calls each service in an order which they were registered, one at the time. If any service throws an exception,
	 * execution will be stopped at that point.
	 * @param req {Object} The Node.js HTTP Request object
	 * @param res {Object} The Node.js HTTP Resource object
	 * @returns {Promise} A promise of
	 * @private
	 */
	$onRequest (req, res, next) {
		debug.assert(req).is('object');
		debug.assert(res).is('object');
		debug.assert(next).ignore(undefined).is('function');
		if (!next) next = () => {};
		return this._requestHandler(req, res, next);
	}

}

export default RequestService;