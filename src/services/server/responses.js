/**
 * @module @norjs/cloud-backend
 */

import ref from '@norjs/ref';
import { HTTPError } from '@norjs/errors';
import { createBodyIDs } from '@norjs/cloud-common';
import parseRequestData from './parseRequestData.js';

import {
	_,
	debug,
	symbols,
	getAllKeys,
	notPrivate,
	getConstructors,
	notFunction,
	parseFunctionArgumentNames,
	isDevelopment
} from '../../lib/index.js';

/**
 * Merge two paths as one
 *
 * @param a {string}
 * @param b {string}
 * @returns {string}
 */
function joinRef (a, b) {
	const l = a.length;
	if (l && a[l-1] === '/') return `${a}${b}`;
	return `${a}/${b}`;
}

/**
 * @param context
 * @param content
 * @param parent
 * @param $ref
 * @return {{$name: *, $ref: *, $hash: null, $id: null, $type: *[]}}
 */
function prepareObjectPrototypeResponse (context, content, parent, $ref = context.$ref()) {

	//debug.log('parent [#1] = ', parent);

	const properties = getAllKeys(content).filter(notPrivate);

	//debug.log('parent [#1.1] = ', parent);
	//debug.log('content = ', content);
	//debug.log('properties = ', properties);

	const methods = _.filter(properties, key => {
		const type = Object.getOwnPropertyDescriptor(content, key);
		//debug.log('type = ', type);
		if (type && type.get) return false;
		if (type && type.set) return false;
		return _.isFunction(content[key]);
	});

	//debug.log('parent [#2] = ', parent);

	//debug.log("content = ", content);
	//debug.log("methods = ", methods);
	//debug.log("members = ", members);
	//debug.log("properties = ", properties);

	//const $constructor = _.get(content, 'constructor');
	const $name = _.get(content, 'constructor.name');

	//debug.log('parent [#3] = ', parent);

	let constructors = getConstructors(content);
	if (constructors) {
		if (!_.isArray(constructors)) {
			constructors = [constructors];
		}
		if (_.last(constructors) === 'Object') {
			constructors.length -= 1;
		}
	} else {
		constructors = [];
	}

	//debug.log('parent [#4] = ', parent);

	let body = {
		$id: null,
		$hash: null,
		$ref,
		$name,
		$type: [$name].concat(constructors)
		//$args: parseFunctionArgumentNames($constructor)
	};

	//debug.log('parent [#5] = ', parent);

	_.forEach(methods, method => {
		body[method] = prepareFunctionResponse(context, content[method], joinRef($ref, method));
	});

	let id, hash;
	[id, hash] = createBodyIDs(body);

	body.$id = id;
	body.$hash = hash;

	//debug.log('parent [#6] = ', parent);

	return body;
}

/**
 * @param context {Context}
 * @param content
 * @param $ref
 * @return {{$ref: *, $hash: null, $id: null, $type: Array}}
 */
function prepareObjectResponse (context, content, $ref = context.$ref()) {

	//debug.log('content [before] = ', content);

	const properties = Object.getOwnPropertyNames(content).filter(notPrivate);
	const methods = _.filter(properties, key => _.isFunction(content[key]));

	const allProperties = getAllKeys(content).filter(notPrivate);
	const members = _.filter(allProperties, key => !_.isFunction(content[key]));

	//debug.log("content = ", content);
	//debug.log("methods = ", methods);
	//debug.log("members = ", members);
	//debug.log("properties = ", properties);

	//debug.log('content [after#1] = ', content);

	let body = {
		$id: null,
		$hash: null,
		$ref,
		$type: getConstructors(content)
	};

	_.forEach(members, member => {
		if (_.isObject(content[member]) && content[member]) {
			body[member] = prepareResponse(context, content[member], joinRef($ref, member))
		} else {
			body[member] = _.cloneDeep(content[member]);
		}
	});

	//debug.log('content [after#2] = ', content);

	_.forEach(methods, method => {
		body[method] = prepareFunctionResponse(context, content[method], joinRef($ref, method))
	});

	let id, hash;
	[id, hash] = createBodyIDs(body);

	//debug.log('content [after#3] = ', content);

	body.$id = id;
	body.$hash = hash;

	//debug.log('content [after#4] = ', content);

	const proto = Object.getPrototypeOf(content);
	const name = proto && _.get(proto, 'constructor.name');
	if (proto && (name !== 'Object')) {
		//debug.log('content [after#4.1] = ', content);
		body.$prototype = prepareObjectPrototypeResponse(context, proto, content, $ref);
		//debug.log('content [after#4.2] = ', content);
	}

	//debug.log('content [after#5] = ', content);

	let bodyMethods = [];
	_.each(_.keys(symbols.method), symbolKey => {
		const symbol = symbols.method[symbolKey];
		if (content[symbol]) {
			const value = content[symbol];
			if (_.isFunction(value)) {
				bodyMethods.push( prepareCustomHttpMethodResponse(context, value, $ref, _.toLower(symbolKey)) );
			} else {
				bodyMethods.push( prepareScalarResponse(context, value, $ref, _.toLower(symbolKey)) );
			}
		}
	});

	if (bodyMethods.length) {
		body.$alternatives = bodyMethods;
	}

	return body;
}

/**
 *
 * @param key
 * @returns {boolean}
 */
function notArgumentsOrCaller (key) {
	if (key === 'arguments') return false;
	if (key === 'caller') return false;
	return true;
}

/**
 * @param context {Context}
 * @param f {function}
 * @param $ref {string}
 * @param method
 * @return {{$method: string, $args: Array, $ref: *, $type: string}}
 */
function prepareFunctionResponse (context, f, $ref = context.$ref(), method = 'post') {
	debug.assert(context).is('object');
	debug.assert(f).is('function');

	let body = {
		$ref,
		$type: 'Function',
		$method: method,
		$args: parseFunctionArgumentNames(f)
	};

	getAllKeys(f).filter(notPrivate).filter(notArgumentsOrCaller).filter(key => notFunction(f[key])).forEach( key => {
		body[key] = f[key];
	} );

	return body;
}

/**
 * @param context {Context}
 * @param f {function}
 * @param $ref
 * @param method
 * @return {{$method: string, $args: Array, $ref: *, $type: string}}
 */
function prepareCustomHttpMethodResponse (context, f, $ref = context.$ref(), method = 'post') {
	debug.assert(context).is('object');
	debug.assert(f).is('function');

	let body = {
		$ref,
		$type: 'Request',
		$method: method
	};

	return body;
}

/**
 * @param context {Context}
 * @param content
 * @param $ref
 * @param method
 * @return {*}
 */
function prepareScalarResponse (context, content, $ref = context.$ref(), method = 'post') {

	if (_.isFunction(content)) {
		return prepareFunctionResponse(context, content, $ref, method);
	}

	// FIXME: Implement better way to transfer undefined!
	if (content === 'undefined') {
		return {
			$ref,
			$path: 'payload',
			$type: 'undefined',
			payload: undefined
		};
	}

	return {
		$ref,
		$path: 'payload',
		$type: getConstructors(content),
		payload: content
	};
}

/**
 * @param context {Context}
 * @param content
 * @param $ref
 * @return {*}
 */
function prepareResponse (context, content, $ref = context.$ref()) {
	if (content && (content instanceof Date)) {
		return prepareScalarResponse(context, content, $ref);
	}
	if (_.isArray(content)) {
		return prepareScalarResponse(context, content, $ref);
	}
	if (_.isObject(content)) {
		return prepareObjectResponse(context, content, $ref);
	}
	return prepareScalarResponse(context, content, $ref);
}

/**
 *
 * @param key {string}
 * @param value
 * @returns {*}
 * @private
 */
function _parseExceptionProperty (key, value) {
	if (key === 'stack') {
		return _.split(value, "\n");
	}
	return _.cloneDeep(value);
}

/**
 * @param context {Context}
 * @param code {number}
 * @param message {string}
 * @param exception
 * @param $ref
 * @return {{code: *, $statusCode: *, message: *, $ref: *, $type: string}}
 */
function prepareErrorResponse (context, code, message, exception, $ref = context.$ref()) {

	const $type = 'error';

	if (_.isNumber(message) && _.isString(code)) {
		[message, code] = [code, message];
	}

	if (exception instanceof HTTPError) {
		message = exception.message;
		code = exception.code;
	}

	debug.assert(context).is('object');
	debug.assert(code).is('number');
	debug.assert(message).is('string');

	let body = {
		$type,
		$ref,
		$statusCode: code,
		code,
		message
	};

	if (isDevelopment && exception) {
		debug.assert(exception).is('object');

		body.exception = {
			$type: getConstructors(exception)
		};

		_.forEach(getAllKeys(exception).filter(notPrivate).filter(notFunction),
			key => {
			body.exception[key] = _parseExceptionProperty(key, exception[key]);
		});
	}

	//debug.log( 'exception: ' , Object.keys(body.exception));
	//debug.log( 'exception: ' , JSON.stringify(body.exception));
	//debug.log( 'test: ' , JSON.stringify(body.$type));
	//debug.log( 'test: ' , JSON.stringify(body.$ref));
	//debug.log( 'test: ' , JSON.stringify(body.$statusCode));
	//debug.log( 'test: ' , JSON.stringify(body.code));
	//debug.log( 'test: ' , JSON.stringify(body.message));
	//debug.log( 'test exception: ' , JSON.stringify(body.exception));
	//debug.log( 'test final: ' , JSON.stringify(body));

	return body;
}

/**
 *
 * @param req {object}
 * @param commonName
 * @returns {string}
 * @private
 */
function _getIdentity (req, commonName) {
	const unverifiedUser_ = req.unverifiedUser ? '~' + req.unverifiedUser : '';
	////debug.log('unverifiedUser_ = ', unverifiedUser_);
	const user_ = req.user ? '' + req.user : unverifiedUser_;
	//debug.log('user_ = ', user_);
	return (commonName ? '+' + commonName : user_);
}

/**
 *
 * @param basePath
 * @param req
 * @param url
 * @returns {*}
 * @private
 */
function _ref (basePath, req, url) {
	if (basePath) {
		return ref(req, url, basePath);
	}
	return ref(req, url);
}

/**
 *
 * @type {number}
 */
const NS_PER_SEC = 1e9;

/**
 * Cloud-backend context object.
 */
class Context {

	/**
	 *
	 * @param req
	 */
	constructor (req) {
		this.req = req;
		this.remoteAddress = _.get(req, 'connection.remoteAddress');
		this.peerCert = req.socket && req.socket.getPeerCertificate && req.socket.getPeerCertificate();
		this.commonName = _.get(this.peerCert, 'subject.CN');
		this.method = _.toLower(req.method);
		this.url = req.url;
		this.unverifiedUser = req.unverifiedUser;
		this.user = req.user;
		this.time = null;
	}

	/**
	 * NodeJS request object.
	 *
	 * @returns {*}
	 */
	get request () {
		return this.req;
	}

	$getIdentity () {
		return _getIdentity(this.req, this.commonName);
	}

	/**
	 * Parses request data.
	 *
	 * @param type {string} Either `"string"` or `"binary"`.
	 * @param limit {number} Maximum size limit
	 * @returns {Promise.<string|Buffer>} Depending on the type, either a promise of `string` or a `Buffer` is returned.
	 */
	$getBody (type = 'string', {limit = 1e6} = {}) {
		return parseRequestData(this.req, {type, limit});
	}

	/**
	 *
	 * @param basePath
	 * @returns {*|*}
	 */
	$ref (basePath) {
		return _ref(basePath, this.req, this.url);
	}

	/**
	 *
	 * @param time
	 */
	$setTime (time) {
		this.time = time;
	}

	$getTime () {
		return this.time;
	}

	$getTimeDiff () {
		let diff;
		const hrtime = this.time;
		if (hrtime) {
			diff = process.hrtime(hrtime);
			return (diff[0] * NS_PER_SEC + diff[1]) / 1000000;
		}
	}

}

/**
 * @param req {object}
 * @return {Context}
 */
function createContext (req) {
	debug.assert(req).is('object');
	if (req.$context) return req.$context;
	return req.$context = new Context(req);
}

export {
	prepareObjectPrototypeResponse,
	prepareObjectResponse,
	prepareFunctionResponse,
	prepareScalarResponse,
	prepareResponse,
	prepareErrorResponse,
	createContext
}
