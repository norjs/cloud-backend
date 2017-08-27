import Q from 'q';
import _ from 'lodash';
import is from 'nor-is';
import debug from 'nor-debug';

import serviceRequestHandler from './serviceRequestHandler';
import coreRequestHandler from './coreRequestHandler.js';
import createServer from './createServer.js';
import BasicAuthRequestHandler from './auth/basic/BasicAuthRequestHandler.js';
import BearerAuthRequestHandler from './auth/bearer/BearerAuthRequestHandler.js';
import RequestService from './RequestService.js';

/**  */
export default class ServerService {

	/** Constructor */
	constructor (MainService, RequestService, ServiceCache, LogService) {

		/**
		 * @member {MainService}
		 * @private
		 */
		this._main = MainService;

		/**
		 * @member {RequestService}
		 * @private
		 */
		this._request = RequestService;

		/**
		 * @member {ServiceCache}
		 * @private
		 */
		this._serviceCache = ServiceCache;

		/**
		 * @member {LogService}
		 * @private
		 */
		this._log = LogService;

		/**
		 * @member {string|undefined}
		 * @private
		 */
		this._serviceName = undefined;
		this._config = null;
	}

	/**
	 * @returns {Promise}
	 */
	$onConfig (config) {
		return Q.fcall( () => {
			debug.assert(config).is('object');

			if (!_.has(config, 'listen')) return;

			this.basicAuthEnabled = !!(config.auth && config.auth.basic);
			this.bearerAuthEnabled = !!(config.auth && config.auth.bearer);

			debug.assert(config.protocol).ignore(undefined).is('string');
			debug.assert(config.port).ignore(undefined).is('integer');

			debug.assert(config.ca).ignore(undefined).is('string');
			debug.assert(config.key).ignore(undefined).is('string');
			debug.assert(config.cert).ignore(undefined).is('string');

			this._config = config;

			// Load optional services
			let promises = [];

			if (this.basicAuthEnabled) {
				promises.push(
					this._serviceCache.load(BasicAuthRequestHandler).then(
						obj => this._basicAuthRequestHandler = obj
					)
				);
			}

			if (this.bearerAuthEnabled) {
				promises.push(
					this._serviceCache.load(BearerAuthRequestHandler).then(
						obj => this._bearerAuthRequestHandler = obj
					)
				);
			}

			return Q.all(promises);

		}).then( () => {

			const config = this._config;

			// Detect service name
			this._serviceName = config.listen;

			if ( (!this._serviceName) || (config.listen === true) ) {
				return Q.when(this._main.getFirstServiceUUID()).then(id => this._serviceName = id);
			}

			return this._serviceName;

		}).then(serviceName => {

			let handlers = [];

			// CoreRequestHandler
			handlers.push(
				() => this._request.register({'$onRequest': coreRequestHandler})
			);

			// Optional BasicAuthRequestHandler
			if (this.basicAuthEnabled) {
				handlers.push(
					() => {
						// Enable optional auth supports
						if (this.basicAuthEnabled) {
							return this._request.register(this._basicAuthRequestHandler);
						}
					}
				);
			}

			// Optional BearerAuthRequestHandler
			if (this.bearerAuthEnabled) {
				handlers.push(
					() => {
						// Enable optional auth supports
						if (this.bearerAuthEnabled) {
							return this._request.register(this._bearerAuthRequestHandler);
						}
					}
				);
			}

			// ServiceRequestHandler
			if (serviceName) {

				handlers.push(
					() => this._request.register({
						'$onRequest': serviceRequestHandler(
							serviceName,
							name => this._serviceCache.get(name)
						)
					})
				);

			} else {

				// No-op request handler
				handlers.push(
					() => ({ $onRequest: () => {} })
				);
			}

			return _.reduce(handlers, (a, b) => a.then(b), Q());
		});

	}

	/**
	 * @private
	 * @returns {Promise}
	 */
	_startServer () {
		const config = this._config;
		return this._server = createServer(config, (req, res) => this._request.$onRequest(req, res)).then(() => {
			let name = this._serviceName;
			if (is.uuid(name)) {
				return this._serviceCache.getNameById(name).then(name_ => {
					this._log.info('[ServerService] Service ' + name_ + ' started at port ' + (config.port||3000) + ' as ' + (config.protocol||'https') );
				});
			}
			this._log.info('[ServerService] Service ' + name + ' started at port ' + (config.port||3000) + ' as ' + (config.protocol||'https') );
		});
	}

	/**
	 * @returns {Promise}
	 */
	$onInit () {
		return this._startServer();
	}

}
