
import _ from 'lodash';
import serviceRequestHandler from './serviceRequestHandler';
import createServer from './createServer.js';
import debug from 'nor-debug';

/** Starts a service as a server (HTTP or HTTPS) */
const startService = (serviceId, globalConfig) => {

	debug.assert(serviceId).is('uuid');
	debug.assert(globalConfig).ignore(undefined).is('object');


};

export default startService;