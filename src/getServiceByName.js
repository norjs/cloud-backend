
import Q from 'q';
import is from 'nor-is';
import resolve from 'resolve';
import debug from 'nor-debug';
import cloudClient from '@sendanor/cloud-client';

/** Get a Service class from a service name
 * @param name {String} The service module name based on CWD
 * @returns {Function} The class for specific service
 */
export function getServiceByRequire (name) {
	debug.assert(name).is('string');

	const absolutePath = resolve.sync(name, { basedir: process.cwd() });
	debug.assert(absolutePath).is('string');

	const Module = require(absolutePath);

	// Support babel-generated ES6 "export default"

	const Service = (is.object(Module) && is.func(Module.default)) ? Module.default : Module;
	debug.assert(Service).is('defined');

	return Service;
}

/** Get a Service class from a service name
 * @param name {String} The service module name based on CWD
 * @returns {Function} The class for specific service
 */
export function getServiceByURL (name) {
	debug.assert(name).is('string');
	return cloudClient(name);
}

/** Get a Service class from a service name
 * @param name {String} The service module name based on CWD
 * @returns {Function} The class for specific service
 */
export function getServiceByName (name) {
	return Q.fcall(() => {
		debug.assert(name).is('string');
		if (is.url(name)) return getServiceByURL(name);
		return getServiceByRequire(name);
	});
}

export default getServiceByName;
