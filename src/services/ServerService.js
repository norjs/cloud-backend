import Q from 'q';
import _ from 'lodash';
import is from 'nor-is';
import debug from 'nor-debug';

import serviceRequestHandler from '../serviceRequestHandler';
import coreRequestHandler from '../coreRequestHandler.js';
import createServer from '../createServer.js';
import basicAuthRequestHandler from '../basicAuthRequestHandler.js';

/**  */
export default class ServerService {

	constructor (MainService, RequestService, ServiceCache, LogService) {
		this._main = MainService;
		this._request = RequestService;
		this._serviceCache = ServiceCache;
		this._log = LogService;
		this._serviceName = undefined;
		this._config = null;
	}

	$onConfig (config) {

		debug.assert(config).is('object');

		if (!_.has(config, 'listen')) return;

		debug.assert(config.protocol).ignore(undefined).is('string');
		debug.assert(config.port).ignore(undefined).is('integer');

		debug.assert(config.ca).ignore(undefined).is('string');
		debug.assert(config.key).ignore(undefined).is('string');
		debug.assert(config.cert).ignore(undefined).is('string');

		this._config = config;

		return Q.fcall( () => {

			this._serviceName = config.listen;

			if (!this._serviceName) {
				return Q.when(this._main.getFirstServiceUUID()).then(id => this._serviceName = id);
			}

			return this._serviceName;

		}).then(serviceName => {
			return _.reduce([
				() => this._request.register({'$onRequest': coreRequestHandler}),
				() => {
					// Enable optional auth supports
					if (config.auth && config.auth.basic) {
						return this._request.register({'$onRequest': basicAuthRequestHandler(config.auth.basic)});
					}
				},
				() => this._request.register({
					'$onRequest': serviceRequestHandler(
						serviceName,
						name => this._serviceCache.get(name)
					)
				})
			], (a, b) => a.then(b), Q())
		});

	}

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

	$onInit () {
		return this._startServer();
	}

}
