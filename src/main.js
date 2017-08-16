#!/usr/bin/env node
/* Sendanor's cloud micro service backend runner */

import {
	_,
	is,
	debug,
	moment,
	fs,
	getServiceByName
} from './lib/index.js';

import {
	MainService,
	ServiceCache,
	builtInServices
} from './services';

import minimist from 'minimist';
//import fs from 'fs';

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
			config[camelCaseKey.substr(0, camelCaseKey.length - 4)] = fs.sync.readFile(value, {encoding:'utf8'});
		}

		// Other, directly
		config[camelCaseKey] = value;
	});

	// Enable --listen automatically if --port or --protocol exists
	if ( (config.protocol || config.port) && (!_.has(config, 'listen')) ) {
		config.listen = '';
	}

	const servicePaths = argv._;

	const userServices = _.map(servicePaths, servicePath => {
		debug.assert(servicePath).is('string');
		return getServiceByName(servicePath);
	});

	if ( (config.protocol === 'https') && ((!config.ca) || (!config.cert) || (!config.key)) ) {
		console.log(usage);
	} else {

		const $main = new MainService();

		$main.setServiceCache(ServiceCache)
		 .setBuiltInServices(builtInServices)
		 .setUserServices(userServices)
		 .loadServices().then(
			m => m.configServices(config)
		).then(
			m => m.initServices()
		).then(
			m => m.runServices()
		).fail(err => {
			const log = $main.getLog();
			const f = log && is.function(log.error) ? log.error : debug.error;
			f('Exception: ', err);
		}).done();
	}

}
