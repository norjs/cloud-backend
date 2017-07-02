
import _ from 'lodash';
import serviceRequestHandler from './serviceRequestHandler';
import createServer from './createServer.js';
import debug from 'nor-debug';

/** Starts a service as a server (HTTP or HTTPS) */
const startService = (serviceInstance, globalConfig) => {

	debug.assert(serviceInstance).is('object');
	debug.assert(globalConfig).ignore(undefined).is('object');

	let config = {};
	_.forEach(Object.keys(globalConfig), key => config[key] = globalConfig[key]);

	debug.assert(config.protocol).ignore(undefined).is('string');
	debug.assert(config.port).ignore(undefined).is('integer');
	debug.assert(config.ca).is('string');
	debug.assert(config.key).is('string');
	debug.assert(config.cert).is('string');

	config.requestHandler = serviceRequestHandler(serviceInstance);
	debug.assert(config.requestHandler).is('function');

	return createServer(config);
};

export default startService;