/**
 * @module @sendanor/cloud-backend
 */

import {
	Q,
	_,
	is,
	debug,
	EventEmitter
} from '../../lib/index.js';

import serviceRequestHandler from './serviceRequestHandler';
import coreRequestHandler from './coreRequestHandler.js';
import createServer from './createServer.js';
import BasicAuthRequestHandler from './auth/basic/BasicAuthRequestHandler.js';
import BearerAuthRequestHandler from './auth/bearer/BearerAuthRequestHandler.js';
import RequestService from './RequestService.js';

/** Implements HTTP(S) request server
 *
 * @static
 */
class ServerService {

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

		this._server = null;

		this._io = null;
	}

	/**
	 * @returns {Promise}
	 * @private
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
			const name = this._serviceName;
			return Q.all([
				Q.when(is.uuid(name) ? this._serviceCache.getNameById(name) : name),
				this._serviceCache.get(name)
	        ]);
		}).spread( (name, instance) => {
			this._log.info('[ServerService] Service ' + name + ' started at port ' + (config.port||3000) + ' as ' + (config.protocol||'https') );

			if (instance && is.function(instance.emit)) {
				return this._setupSocketIO(name, instance);
			}
		});
	}

	/** Setup socket.io connection on the server and proxy it to service's EventEmitter.
	 * @param name {string} The name of instance
	 * @param instance {EventEmitter|Object} Any service instance with .emit function capabilities.
	 * @private
	 */
	_setupSocketIO (name, instance) {
		const config = this._config;
		const socketIoConfig = Object.assign({}, _.get(this._config, 'server.io') || {});

		const io = this._io = require('socket.io')(this._server, socketIoConfig);
		this._log.info('[ServerService] [Socket.IO] [' + name + '] Started at port ' + (config.port||3000) + ' as ' + (config.protocol||'https') );

		let remoteEmitters = [];

		const origEmit = instance.emit.bind(instance);

		instance.emit = (...args) => {

			Q.all(_.map(remoteEmitters, emit => {
				debug.assert(emit).is('function');
				return Q.when(emit(...args)).catch(
					err => this._log.error('[Socket.io] Error in '+name+'.emit() while emitting outside: ' + err)
				);
			})).catch(
				err => this._log.error('[Socket.io] Error in '+name+'.emit(): ' + err)
			);

			return origEmit(...args);
		};

		io.on('connection', socket => {
			this._log.info( '[ServerService] [Socket.IO] [' + name + '] New connection' );

			const f = (...args) => socket.emit('emit', args, name);

			remoteEmitters.push(f);

			socket.on('emit', (args, name) => instance.emit(...args));

			socket.on('disconnecting',
				reason => {
					this._log.info( '[ServerService] [Socket.IO] [' + name + '] Connection disconnected: ' + reason );
					_.remove(remoteEmitters, e => e === f);
				}
			);

		});
	}

	/**
	 * @returns {Promise}
	 * @private
	 */
	$onInit () {
		return this._startServer();
	}

}

export default ServerService;
