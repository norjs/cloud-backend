
import _ from 'lodash';
import debug from 'nor-debug';
import is from 'nor-is';
import ref from 'nor-ref';
import { HTTPError } from 'nor-errors';
import { createBodyIDs } from '@sendanor/cloud-common';
import parseRequestData from './parseRequestData.js';

import { getAllKeys } from './helpers.js';
import { notPrivate } from './helpers.js';
import { getConstructors } from './helpers.js';
import { notFunction } from './helpers.js';
import { parseFunctionArgumentNames } from './helpers.js';

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

/** */
export function prepareObjectPrototypeResponse (context, content) {
	const properties = getAllKeys(content).filter(notPrivate);
	const methods = _.filter(properties, key => is.func(content[key]));

	//debug.log("content = ", content);
	//debug.log("methods = ", methods);
	//debug.log("members = ", members);
	//debug.log("properties = ", properties);

	//const $constructor = _.get(content, 'constructor');
	const $name = _.get(content, 'constructor.name');

	let constructors = getConstructors(content);
	if (constructors) {
		if (!is.array(constructors)) {
			constructors = [constructors];
		}
		if (_.last(constructors) === 'Object') {
			constructors.length -= 1;
		}
	} else {
		constructors = [];
	}

	let body = {
		$id: null,
		$hash: null,
		$ref: context.$ref(),
		$name,
		$type: [$name].concat(constructors)
		//$args: parseFunctionArgumentNames($constructor)
	};

	_.forEach(methods, method => body[method] = prepareFunctionResponse(context, content[method], context.$ref(method)) );

	let id, hash;
	[id, hash] = createBodyIDs(body);

	body.$id = id;
	body.$hash = hash;

	return body;
}

/** */
export function prepareObjectResponse (context, content) {

	const properties = Object.getOwnPropertyNames(content).filter(notPrivate);
	const methods = _.filter(properties, key => is.func(content[key]));

	const allProperties = getAllKeys(content).filter(notPrivate);
	const members = _.filter(allProperties, key => !is.func(content[key]));

	//debug.log("content = ", content);
	//debug.log("methods = ", methods);
	//debug.log("members = ", members);
	//debug.log("properties = ", properties);

	let body = {
		$id: null,
		$hash: null,
		$ref: context.$ref(),
		$type: getConstructors(content)
	};

	_.forEach(members, member => body[member] = _.cloneDeep(content[member]) );

	_.forEach(methods, method => body[method] = prepareFunctionResponse(context, content[method], context.$ref(method)) );

	let id, hash;
	[id, hash] = createBodyIDs(body);

	body.$id = id;
	body.$hash = hash;

	const proto = Object.getPrototypeOf(content);
	const name = proto && _.get(proto, 'constructor.name');
	if (proto && (name !== 'Object')) {
		body.$prototype = prepareObjectPrototypeResponse(context, proto);
	}

	return body;
}

function notArgumentsOrCaller (key) {
	if (key === 'arguments') return false;
	if (key === 'caller') return false;
	return true;
}

/** */
export function prepareFunctionResponse (context, f, ref) {
	debug.assert(context).is('object');
	debug.assert(f).is('function');

	let body = {
		$ref: ref || context.$ref(),
		$type: 'Function',
		$method: 'post',
		$args: parseFunctionArgumentNames(f)
	};

	getAllKeys(f).filter(notPrivate).filter(notArgumentsOrCaller).filter(key => notFunction(f[key])).forEach( key => body[key] = f[key] );

	return body;
}

/** */
export function prepareScalarResponse (context, content) {

	if (is.function(content)) {
		return prepareFunctionResponse(context, content);
	}

	return {
		$ref: context.$ref(),
		$path: 'payload',
		$type: getConstructors(content),
		payload: content
	};
}

/** */
export function prepareResponse (context, content) {
	if (content && (content instanceof Date)) {
		return prepareScalarResponse(context, content);
	}
	if (is.array(content)) {
		return prepareScalarResponse(context, content);
	}
	if (is.object(content)) {
		return prepareObjectResponse(context, content);
	}
	return prepareScalarResponse(context, content);
}

function _parseExceptionProperty (key, value) {
	if (key === 'stack') {
		return _.split(value, "\n");
	}
	return value;
}

/** */
export function prepareErrorResponse (context, code, message, exception) {

	const $type = 'error';

	if (is.number(message) && is.string(code)) {
		[message, code] = [code, message];
	}

	if (exception instanceof HTTPError) {
		message = exception.message;
		code = exception.code;
	}

	let body = {
		$type,
		$ref: context.$ref(),
		$statusCode: code,
		code,
		message
	};

	if (isDevelopment && exception) {
		body.exception = {
			$type: getConstructors(exception)
		};
		_.forEach(getAllKeys(exception).filter(notPrivate).filter(notFunction),
			key => body.exception[key] = _parseExceptionProperty(key, exception[key]) );
	}

	return body;
}

function _getIdentity (req, commonName) {
	const unverifiedUser_ = req.unverifiedUser ? '~' + req.unverifiedUser : '';
	//debug.log('unverifiedUser_ = ', unverifiedUser_);
	const user_ = req.user ? '' + req.user : unverifiedUser_;
	//debug.log('user_ = ', user_);
	return (commonName ? '+' + commonName : user_);
}

function _ref (basePath, req, url) {
	if (basePath) {
		return ref(req, url, basePath);
	}
	return ref(req, url);
}

class Context {

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

	$getIdentity () { return _getIdentity(this.req, this.commonName); }

	$getBody () { return parseRequestData(this.req); }

	$ref (basePath) { return _ref(basePath, this.req, this.url); }

	$setTime (time) {
		this.time = time;
	}

	$getTime () {
		return this.time;
	}

}

/** */
export function createContext (req) {
	debug.assert(req).is('object');
	if (req.$context) return req.$context;
	return req.$context = new Context(req);
}
