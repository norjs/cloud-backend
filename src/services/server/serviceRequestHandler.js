/**
 * @module @sendanor/cloud-backend
 */

import { HTTPError } from 'nor-errors';

import {
	Async,
	_,
	symbols,
	debug,
	isPrivate
} from '../../lib/index.js';

import {
	createContext,
	prepareResponse,
	prepareErrorResponse
} from './responses.js';

/** Splits an URL string into parts (an array)
 *
 * @param url
 * @returns {*}
 * @private
 */
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

/** Try to parse JSON, if it looks like JSON
 *
 * @param body
 * @private
 */
function _parseJson (body) {
	if (!body) return;
	return JSON.parse(body);
}

/**
 *
 * @param context
 * @param content
 * @param part
 * @param parts
 * @param body
 * @returns {Promise.<TResult>|*}
 * @private
 */
function _getContentFunctionCall (context, content, part, parts, body) {
	body = _parseJson(body);
	const args = (body && body.$args) || [];
	debug.assert(args).is('array');
	return Async.resolve(content[part](...args)).then(reply => {
		//debug.log('reply = ', reply);
		//debug.log('parts = ', parts);

		// FIXME: Implement better way to transfer undefined!
		if (reply === undefined) {
			return 'undefined';
		}

		return _getContent(context, reply, parts);
	});
}

/** Recursively get content
 *
 * @param context
 * @param content
 * @param parts
 * @returns {*}
 * @private
 */
function _getContent (context, content, parts) {
	debug.assert(parts).is('array');

	const method = context.method;
	//debug.log('method = ', method);

	//debug.log('content =', content);

	//debug.log('_getContent(', content, ', ', parts, ')');

	if (parts.length === 0) {
		//debug.log('content =', content);

		if (!content) {
			throw new HTTPError(404);
		}
		debug.assert(content).is('object');

		const upperMethod = _.toUpper(method);
		const methodSymbol = upperMethod && (_.has(symbols.method, upperMethod) ? symbols.method[upperMethod] : undefined);

		if (methodSymbol && content[methodSymbol] !== undefined) {
			const value = content[methodSymbol];
			if (_.isFunction(value)) {
				return value(context);
			} else {
				return value;
			}
		}

		switch (method) {

		case 'get':
		case 'options':
		case 'head':
			return content;

		default:
			throw new HTTPError(405);
		}
	}

	const part = parts.shift();
	//debug.log('part =', part);

	if (isPrivate(part)) {
		//debug.log('part is private');
		return;
	}

	debug.assert(content).is('object');
	//debug.log('content = ', content);
	//debug.log('content['+part+'] =', content[part]);

	if (_.isFunction(content[part])) {
		switch (method) {

		case 'post':
			//debug.log('Calling ', part);
			return context.$getBody().then(body => _getContentFunctionCall(context, content, part, parts, body) );

		case 'get':
			return _getContent(context, content[part], parts);

		case 'options':
			return _getContent(context, content[part], parts);

		default:
			throw new HTTPError(405);
		}

	}

	//debug.log('content['+part+'] not function');
	return _getContent(context, content[part], parts);
}

/**
 *
 * @param context
 * @param subContent
 * @returns {*}
 * @private
 */
function __serviceRequestParseSubContent (context, subContent) {
	//debug.log('subContent = ', subContent);
	if (subContent !== undefined) {
		return prepareResponse(context, subContent);
	} else {
		return prepareErrorResponse(context, 404, 'Not Found');
	}
}

/**
 *
 * @param content
 * @param req
 * @returns {Promise.<TResult>|*}
 * @private
 */
function ___serviceRequestHandler (content, req) {
	const context = createContext(req);
	const parts = _splitURL(context.url);
	return Async.resolve(_getContent(context, content, parts)).then(
		subContent => __serviceRequestParseSubContent(context, subContent)
	);
}

/**
 *
 * @param serviceInstance
 * @param req
 * @returns {*}
 * @private
 */
function __serviceRequestHandler (serviceInstance, req) {
	//debug.log('serviceInstance = ', serviceInstance);
	if (_.isArray(serviceInstance)) {
		serviceInstance = _.first(serviceInstance);
	}
	//debug.log('serviceInstance = ', serviceInstance);
	debug.assert(serviceInstance).is('defined');
	return Async.fcall( () => ___serviceRequestHandler(serviceInstance, req));
}

/**
 * @param serviceName {String}
 * @param getInstance {Function}
 * @param req {Object}
 * @returns {Promise}
 * @private
 */
function _serviceRequestHandler (serviceName, getInstance, req) {
	return Async.resolve(getInstance(serviceName)).then(
		serviceInstance => __serviceRequestHandler(serviceInstance, req)
	);
}

/** Build a HTTP(s) request handler for a MicroService
 * @param serviceName {String}
 * @param getInstance {Function}
 * @returns {Function}
 */
function serviceRequestHandler (serviceName, getInstance) {
	debug.assert(serviceName).is('string');
	debug.assert(getInstance).is('function');
	return (req, res, next) => _serviceRequestHandler(serviceName, getInstance, req);
}

export default serviceRequestHandler;
