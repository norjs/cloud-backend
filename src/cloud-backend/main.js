#!/usr/bin/env node

/** Sendanor's cloud micro service backend runner
 */

import minimist from 'minimist';
import _ from 'lodash';
import is from 'nor-is';
import debug from 'nor-debug';
import Q from 'q';
import startServiceByName from './startServiceByName.js';
import fs from 'fs';
import ServiceCache from './ServiceCache.js';
import getServiceByName from './getServiceByName.js';
import serviceRequestHandler from './serviceRequestHandler';
import createServer from './createServer.js';

const argv = minimist(process.argv.slice(2));

const usage = [
	'USAGE: ', process.argv[0], ' [OPT(s)] Service [...Service_N]',
	'  where OPTS is:',
	'    --protocol=PROTOCOL                -- Server protocol; HTTPS (default), or HTTP',
	'    --port=PORT                        -- Server port, by default 3000',
	'    --listen[=SERVICE_NAME]            -- Service to use for incoming requests, by default the first service.',
	'    --ca-file=path/to/ca.crt           -- Server PKI CA certificate file',
	'    --cert-file=path/to/server.crt     -- Server PKI certificate file',
	'    --key-file=path/to/server.key      -- Server PKI private key file',
	'  and Service is a path to JavaScript class file.',
	'  Unless you specify --listen, no HTTP(s) server is started.'
].join('\n');

if (argv._.length === 0) {
	console.log(usage);
} else {

	let config = {};

	_.forEach(Object.keys(argv), key => {
		if (key === '_') return;

		const camelCaseKey = _.camelCase(key);

		if (camelCaseKey.substr(-4, 4) === 'File') {
			config[camelCaseKey.substr(0, camelCaseKey.length - 4)] = fs.readFileSync(argv[key], {encoding:'utf8'});
		}

		config[camelCaseKey] = argv[key];
	});

	// Enable --listen automatically if --port or --protocol exists
	if ( (config.protocol || config.port) && (!config.hasOwnProperty('listen')) ) {
		config.listen = '';
	}

	const servicePaths = argv._;

	const serviceCache = new ServiceCache();

	//config.serviceCache = serviceCache;

	serviceCache.register(serviceCache);

	if ( (!config.ca) || (!config.cert) || (!config.key) ) {
		console.log(usage);
	} else {
		Q.fcall(() => {

			return Q.all(_.map(servicePaths, servicePath => {
				debug.assert(servicePath).is('string');

				const Service = getServiceByName(servicePath);
				debug.assert(Service).is('function');

				return serviceCache.register(Service);

			})).then(() => {
				console.log('All services created.');
			}).fail(err => {
				debug.error('Failed to start some services: ', err);
				return Q.reject(err);
			});

		}).then(() => {

			return Q.all(serviceCache.getUUIDs().map(uuid => {
				const instance = serviceCache.get(uuid);
				if (is.function(instance.$onInit)) {
					return instance.$onInit();
				}
			})).then(() => {
				console.log('All services initialized.');
			}).fail(err => {
				debug.error('Failed to initialize some services: ', err);
				return Q.reject(err);
			});

		}).then(() => {

			if (!config.hasOwnProperty('listen')) {
				return;
			}

			debug.assert(config.protocol).ignore(undefined).is('string');
			debug.assert(config.port).ignore(undefined).is('integer');
			debug.assert(config.ca).is('string');
			debug.assert(config.key).is('string');
			debug.assert(config.cert).is('string');

			let serviceName = config.listen;
			if (!serviceName) {
				serviceName = _.first(serviceCache.getUUIDs());
			}

			const requestHandler = serviceRequestHandler(serviceName, name => serviceCache.get(name));
			debug.assert(requestHandler).is('function');

			return createServer(config, requestHandler).then(() => {
				let name = serviceName;
				if (is.uuid(name)) {
					name = serviceCache.getNameById(name);
				}
				console.log('' + name + ' started at port ' + (config.port||3000) + ' as ' + (config.protocol||'https') );
			});

		}).fail(err => {
			debug.error('Exception: ', err);
		}).done();
	}

}
