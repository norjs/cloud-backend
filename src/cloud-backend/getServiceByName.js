import is from 'nor-is';
import resolve from 'resolve';
import debug from 'nor-debug';

/** Get a Service class from a service name
 * @param name {String} The service module name based on CWD
 * @returns {Function} The class for specific service
 */
const getServiceByName = name => {
	debug.assert(name).is('string');

	const absolutePath = resolve.sync(name, { basedir: process.cwd() });
	debug.assert(absolutePath).is('string');

	const Module = require(absolutePath);

	// Support babel-generated ES6 "export default"

	const Service = (is.object(Module) && is.func(Module.default)) ? Module.default : Module;
	debug.assert(Service).is('function');

	return Service;
};

export default getServiceByName;
