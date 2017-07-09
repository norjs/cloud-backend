
import _ from 'lodash';
import is from 'nor-is';
import Q from 'q';
import debug from 'nor-debug';
import { HTTPError } from 'nor-errors';
import { createContext } from './responses.js';
import { prepareResponse } from './responses.js';
import { prepareErrorResponse } from './responses.js';
import { isPrivate } from './helpers.js';

/** Splits an URL string into parts (an array) */
function _splitURL (url) {
	url = _.trim(url);
	if (!url) return [];
	if (url[0] === '/') url = _.trim(url.substr(1));
	if (!url) return [];
	let parts = _.split(url, '/');
	if ( _.last(parts) === '' ) {
		parts.length = parts.length - 1;
	}
	return parts;
}

/** Try to parse JSON, if it looks like JSON */
function _parseJson (body) {
	if (!body) return;
	return JSON.parse(body);
}

/** */
function _getContentFunctionCall (context, value, parts, body) {
	body = _parseJson(body);
	const args = (body && body.$args) || [];
	debug.assert(args).is('array');
	return _getContent(context, value(...args), parts);
}

/** Recursively get content */
function _getContent (context, content, parts) {
	debug.assert(parts).is('array');

	//debug.log('_getContent(', content, ', ', parts, ')');

	if (parts.length === 0) return content;

	const part = parts.shift();
	//debug.log('part =', part);

	if (isPrivate(part)) return;

	debug.assert(content).is('object');

	const value = content[part];
	//debug.log('value = ', value);

	if (is.function(value)) {
		const method = context.method;
		if (method === 'post') {
			return context.$getBody().then(body => _getContentFunctionCall(context, value, parts, body) );
		} else if (method === 'get') {
			return _getContent(context, content[part], parts);
		} else {
			throw new HTTPError(405);
		}
	} else {
		return _getContent(context, value, parts);
	}
}

function __serviceRequestParseSubContent (context, subContent) {
	if (subContent !== undefined) {
		return prepareResponse(context, subContent);
	} else {
		return prepareErrorResponse(context, 404, 'Not Found');
	}
}

function ___serviceRequestHandler (content, req) {
	const context = createContext(req);
	const parts = _splitURL(context.url);
	return Q.when(_getContent(context, content, parts)).then(
		subContent => __serviceRequestParseSubContent(context, subContent)
	);
}

/** */
function __serviceRequestHandler (serviceInstance, req) {
	if (is.array(serviceInstance)) {
		serviceInstance = _.first(serviceInstance);
	}
	debug.assert(serviceInstance).is('defined');
	return Q.fcall( () => ___serviceRequestHandler(serviceInstance, req));
}

/** */
function _serviceRequestHandler (serviceName, getInstance, req) {
	return Q.when(getInstance(serviceName)).then(
		serviceInstance => __serviceRequestHandler(serviceInstance, req)
	);
}

/** Build a HTTP(s) request handler for a MicroService */
function serviceRequestHandler (serviceName, getInstance) {
	debug.assert(serviceName).is('string');
	debug.assert(getInstance).is('function');
	return req => _serviceRequestHandler(serviceName, getInstance, req);
}

export default serviceRequestHandler;
