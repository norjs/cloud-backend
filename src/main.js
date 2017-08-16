#!/usr/bin/env node
/* Sendanor's cloud micro service backend runner */

import {
	_,
	is,
	debug,
	moment,
	fs,
	PATH,
	getServiceByName
} from './lib/index.js';

import {
	MainService,
	ServiceCache,
	PromptService,
	ServerService,
	RequestService,
	defaultServices
} from './services';

import minimist from 'minimist';

/**
 * @returns {string} The command name
 */
function getCommandName (argv) {
	debug.assert(argv).is('array');
	debug.assert(argv[0]).is('string');
	argv = [].concat(argv);
	if (argv[0].substr(argv[0].length - '/node'.length).toLowerCase() === '/node') {
		argv.shift();
	} else if (argv[0].substr(argv[0].length - '/node.exe'.length).toLowerCase() === '/node.exe') {
		argv.shift();
	}
	return PATH.basename(argv.shift());
}

/** Prints usage information
 * @param argv {Array.<String>} Array of command line arguments. We're interested only the first two here, which are
 *                              used to read the command which was used when this application was started. Node will be
 *                              ignored.
 */
function usage (argv) {
	debug.assert(argv).is('array');
	debug.assert(argv[0]).is('string');

	console.log([
		'USAGE: ' + getCommandName(argv) + ' [OPT(s)] [Service [...Service_N]]',
		'',
		'Service is a path to a JavaScript class file or a URL to connect to.',
		'',
		'Options for PromptService:',
		'',
		'    --prompt[=SERVICE_NAME]         -- Sets a service to use, defaults to the first service.',
		'',
		'  Note! Unless you specify --prompt, no PromptService is started.',
		'',
		'Options for ServerService:',
		'',
		'    --listen[=SERVICE_NAME]         -- Service to use for incoming requests, by default the first service.',
		'    --protocol=PROTOCOL             -- Server protocol; HTTPS (default), or HTTP',
		'    --port=PORT                     -- Server port, by default 3000',
		'    --auth=basic[:USER[:PWHASH]]    -- Enable HTTP basic auth in server',
		'',
		'  These options are required when HTTPS is enabled:',
		'',
		'    --ca-file=path/to/ca.crt        -- PKI CA certificate file',
		'    --cert-file=path/to/server.crt  -- PKI certificate file',
		'    --key-file=path/to/server.key   -- PKI private key file',
		'',
		'  Note! Unless you specify --listen, --port or --protocol, no ServerService is started.',
		'',
	].join('\n'));
}

/** Create configuration object
 * @param argv_ {Array.<String>} Array of command line arguments.
 */
function getConfig (argv_) {
	debug.assert(argv_).is('array');

	const argv = minimist(argv_.slice(2));

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

	config.servicePaths = argv._;

	config.userServices = _.map(config.servicePaths, servicePath => {
		debug.assert(servicePath).is('string');
		return getServiceByName(servicePath);
	});

	config.builtInServices = [].concat(defaultServices);

	if (config.protocol || config.port || config.listen) {

		config.protocol = config.protocol || 'https';

		config.builtInServices.push(RequestService);
		config.builtInServices.push(ServerService);
	}

	if (config.prompt) {
		config.builtInServices.push(PromptService);
	}

	return config;
}

/** The main function for cloud-backend command
 * @param argv_ {Array.<String>} Array of command line arguments.
 */
function main (argv) {
	debug.assert(argv).is('array');

	const config = getConfig(argv);

	if (config.help || config.h) {
		return usage(argv);
	}

	if ( !(config.protocol || config.port || config.listen || config.prompt || config.userServices && config.userServices.length) ) {
		return usage(argv);
	}

	if ( (config.protocol === 'https') && ((!config.ca) || (!config.cert) || (!config.key)) ) {
		return usage(argv);
	}

	const $main = new MainService();

	$main.setServiceCache(ServiceCache)
	     .setBuiltInServices(config.builtInServices)
	     .setUserServices(config.userServices)
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

} // main

main(process.argv);