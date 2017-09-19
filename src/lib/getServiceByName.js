/**
 * @module cloud-backend
 */

import Q from 'q';
import is from 'nor-is';
import resolve from 'resolve';
import debug from 'nor-debug';
import cloudClient from '@sendanor/cloud-client';

/** Get a Service class from a service name
 * @param name {String} The service module name based on CWD
 * @returns {Function} The class for specific service
 */
function getServiceByRequire (name) {
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
function getServiceByURL (name) {
	debug.assert(name).is('string');
	return cloudClient(name);
}

function _getServiceByName (name) {
	debug.assert(name).is('string');
	if (is.url(name)) return getServiceByURL(name);
	return getServiceByRequire(name);
}

/** Get a Service class from a service name
 * @param name {String} The service module name based on CWD
 * @returns {Function} The class for specific service
 */
function getServiceByName (name) {
	return Q.fcall(() => _getServiceByName(name));
}

// Exports
export {
	getServiceByName,
	getServiceByURL,
	getServiceByRequire
}

export default getServiceByName;
