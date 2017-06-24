import serviceRequestHandler from './serviceRequestHandler';
import httpsServer from './httpsServer.js';
import debug from 'nor-debug';

/** Starts a HTTPS service */
const startHTTPSService = (serviceInstance, config) => {

	debug.assert(serviceInstance).is('object');
	debug.assert(config).ignore(undefined).is('object');

	config = config || {};

	debug.assert(config.port).ignore(undefined).is('integer');
	debug.assert(config.ca).is('string');
	debug.assert(config.key).is('string');
	debug.assert(config.cert).is('string');

	return httpsServer({
		port: config.port,
		ca: config.ca,
		cert: config.cert,
		key: config.key,
		requestHandler: serviceRequestHandler(serviceInstance)
	});
};

export default startHTTPSService;