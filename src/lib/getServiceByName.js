/**
 * @module @norjs/cloud-backend
 */

import _ from 'lodash';
import Q from 'q';
import resolve from 'resolve';
import debug from 'nor-debug';
import cloudClient from '@norjs/cloud-client';

/** Returns true if value is a string and looks like a URL (ftp://, http://
 * or https://).
 *
 * @param obj
 * @returns {boolean}
 */
function isURL (obj) {
	return _.isString(obj) && /^(ftp|https?):\/\//.test(obj);
}

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

	const Service = (_.isObject(Module) && _.isFunction(Module.default)) ? Module.default : Module;
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

/**
 *
 * @param name
 * @returns {Function}
 * @private
 */
function _getServiceByName (name) {
	debug.assert(name).is('string');
	if (isURL(name)) return getServiceByURL(name);
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
