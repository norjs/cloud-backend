import is from 'nor-is';
import resolve from 'resolve';
import debug from 'nor-debug';
import startHTTPSService from './startHTTPSService.js';

/** Start a service over HTTPS by a name
 * @param name {String} The service module name based on CWD
 */
const startHTTPSServiceByName = (name, config) => {
	debug.assert(name).is('string');

	const absolutePath = resolve.sync(name, { basedir: process.cwd() });

	const Module = require(absolutePath);

	// Support babel-generated ES6 "export default"

	const Service = (is.object(Module) && is.func(Module.default)) ? Module.default : Module;

	debug.assert(Service).is('function');

	const serviceInstance = new Service();
	return startHTTPSService(serviceInstance, config);
};

export default startHTTPSServiceByName;
