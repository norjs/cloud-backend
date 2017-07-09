#!/usr/bin/env node

/** Sendanor's cloud micro service backend runner
 */

import minimist from 'minimist';
import _ from 'lodash';
import is from 'nor-is';
import debug from 'nor-debug';
import Q from 'q';
import fs from 'fs';
import moment from 'moment';
import ServiceCache from './ServiceCache.js';
import getServiceByName from './getServiceByName.js';
import serviceRequestHandler from './serviceRequestHandler';
import coreRequestHandler from './coreRequestHandler.js';
import createServer from './createServer.js';
import basicAuthRequestHandler from './basicAuthRequestHandler.js';

const argv = minimist(process.argv.slice(2));

const usage = [
	'USAGE: ', process.argv[0], ' [OPT(s)] Service [...Service_N]',
	'  where OPTS is:',
	'    --protocol=PROTOCOL                 -- Server protocol; HTTPS (default), or HTTP',
	'    --port=PORT                         -- Server port, by default 3000',
	'    --listen[=SERVICE_NAME]             -- Service to use for incoming requests, by default the first service.',
	'    --ca-file=path/to/ca.crt            -- PKI CA certificate file',
	'    --cert-file=path/to/server.crt      -- PKI certificate file',
	'    --key-file=path/to/server.key       -- PKI private key file',
	'    --auth=basic[:USER[:PWHASH]]        -- Enable HTTP basic auth in server',
	'  and Service is a path to JavaScript class file or URL to connect to.',
	'  Unless you specify --listen, no server is started.'
].join('\n');

if (argv._.length === 0) {
	console.log(usage);
} else {

	let config = {};

	_.forEach(Object.keys(argv), key => {
		if (key === '_') return;

		let value = argv[key];

		const camelCaseKey = _.camelCase(key);

		// --auth
		if (camelCaseKey === 'auth') {
			value = is.array(value) ? value : [value];
			debug.assert(value).is('array');
			_.forEach(value, value_ => {
				const parts = value_.split(':');
				const type = parts.shift();

				if (type === 'basic') {
					const username = parts.shift();
					const password = parts.join(':');

					if (!config.auth) {
						config.auth = {};
					}

					if (!config.auth.basic) {
						config.auth.basic = {
							type,
							credentials: [{username, password}]
						};
					} else {
						config.auth.basic.credentials.push({username, password});
					}
					console.log(moment().format() + ' [main] Added credentials for auth '+type+' for user ' + username);

					return;
				}

				throw new TypeError("Unsupported auth type: " + type);
			});
			return;
		}

		// --*File
		if (camelCaseKey.substr(-4, 4) === 'File') {
			config[camelCaseKey.substr(0, camelCaseKey.length - 4)] = fs.readFileSync(value, {encoding:'utf8'});
		}

		// Other, directly
		config[camelCaseKey] = value;
	});

	// Enable --listen automatically if --port or --protocol exists
	if ( (config.protocol || config.port) && (!_.has(config, 'listen')) ) {
		config.listen = '';
	}

	const servicePaths = argv._;

	const serviceCache = new ServiceCache();

	let firstServiceUUID;

	//config.serviceCache = serviceCache;

	if ( (config.protocol === 'https') && ((!config.ca) || (!config.cert) || (!config.key)) ) {
		console.log(usage);
	} else {
		Q.fcall(() => {

			return Q.fcall( () => {
				return serviceCache.register(serviceCache).then(() => {
					return Q.all(_.map(servicePaths, servicePath => {
						debug.assert(servicePath).is('string');
						return getServiceByName(servicePath).then(Service => {
							debug.assert(Service).is('defined');
							return serviceCache.register(Service).then(uuid => {
								if (!firstServiceUUID) {
									firstServiceUUID = uuid;
								}
								return uuid;
							});
						});
					})).then(() => {
						console.log(moment().format() + ' [main] All services started.');
					});
				});
			}).fail(err => {
				debug.error('Failed to start some services: ' + ((err && err.message) || ''+err) );
				return Q.reject(err);
			});

		}).then(() => {

			return serviceCache.getUUIDs().then(uuids => Q.all(_.map(uuids, uuid => {
				return serviceCache.get(uuid).then(instance => {
					if (instance && is.function(instance.$onInit)) {
						return instance.$onInit();
					}
				});
			}))).then(() => {
				console.log(moment().format() + ' [main] All services initialized.');
			}).fail(err => {
				debug.error('Failed to initialize some services: ' + ((err && err.message) || ''+err));
				return Q.reject(err);
			});

		}).then(() => {

			if (!_.has(config, 'listen')) {
				return;
			}

			debug.assert(config.protocol).ignore(undefined).is('string');
			debug.assert(config.port).ignore(undefined).is('integer');

			debug.assert(config.ca).ignore(undefined).is('string');
			debug.assert(config.key).ignore(undefined).is('string');
			debug.assert(config.cert).ignore(undefined).is('string');

			let serviceName = config.listen;
			if (!serviceName) {
				serviceName = firstServiceUUID;
			}

			let requestHandler = serviceRequestHandler(serviceName, name => serviceCache.get(name));
			debug.assert(requestHandler).is('function');

			// Enable optional auth supports
			if (config.auth && config.auth.basic) {
				console.log(moment().format() + ' [main] Basic auth support enabled.');
				requestHandler = basicAuthRequestHandler(requestHandler, config.auth.basic);
			}

			// Wrap around coreRequestHandler for error handling, etc.
			requestHandler = coreRequestHandler(requestHandler);

			return createServer(config, requestHandler).then(() => {
				let name = serviceName;
				if (is.uuid(name)) {
					return serviceCache.getNameById(name).then(name_ => {
						console.log(moment().format() + ' [main] Service ' + name_ + ' started at port ' + (config.port||3000) + ' as ' + (config.protocol||'https') );
					});
				}
				console.log(moment().format() + ' [main] Service ' + name + ' started at port ' + (config.port||3000) + ' as ' + (config.protocol||'https') );
			});

		}).fail(err => {
			debug.error('Exception: ', err);
		}).done();
	}

}
