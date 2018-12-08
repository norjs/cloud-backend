/**
 * @module @norjs/cloud-backend
 */

import _ from 'lodash';
import debug from 'nor-debug';
import ref from 'nor-ref';
import { HTTPError } from 'nor-errors';
import { createBodyIDs } from '@norjs/cloud-common';
import parseRequestData from './parseRequestData.js';

import {
	getAllKeys,
	notPrivate,
	getConstructors,
	notFunction,
	parseFunctionArgumentNames,
	isDevelopment
} from '../../lib/index.js';

/** */
function prepareObjectPrototypeResponse (context, content, parent) {

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
		$ref: context.$ref(),
		$name,
		$type: [$name].concat(constructors)
		//$args: parseFunctionArgumentNames($constructor)
	};

	//debug.log('parent [#5] = ', parent);

	_.forEach(methods, method => {
		body[method] = prepareFunctionResponse(context, content[method], context.$ref(method));
	});

	let id, hash;
	[id, hash] = createBodyIDs(body);

	body.$id = id;
	body.$hash = hash;

	//debug.log('parent [#6] = ', parent);

	return body;
}

/** */
function prepareObjectResponse (context, content) {

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
		$ref: context.$ref(),
		$type: getConstructors(content)
	};

	_.forEach(members, member => {
		body[member] = _.cloneDeep(content[member])
	});

	//debug.log('content [after#2] = ', content);

	_.forEach(methods, method => {
		body[method] = prepareFunctionResponse(context, content[method], context.$ref(method))
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
		body.$prototype = prepareObjectPrototypeResponse(context, proto, content);
		//debug.log('content [after#4.2] = ', content);
	}

	//debug.log('content [after#5] = ', content);


	return body;
}

function notArgumentsOrCaller (key) {
	if (key === 'arguments') return false;
	if (key === 'caller') return false;
	return true;
}

/** */
function prepareFunctionResponse (context, f, ref) {
	debug.assert(context).is('object');
	debug.assert(f).is('function');

	let body = {
		$ref: ref || context.$ref(),
		$type: 'Function',
		$method: 'post',
		$args: parseFunctionArgumentNames(f)
	};

	getAllKeys(f).filter(notPrivate).filter(notArgumentsOrCaller).filter(key => notFunction(f[key])).forEach( key => {
		body[key] = f[key];
	} );

	return body;
}

/** */
function prepareScalarResponse (context, content) {

	if (_.isFunction(content)) {
		return prepareFunctionResponse(context, content);
	}

	// FIXME: Implement better way to transfer undefined!
	if (content === 'undefined') {
		return {
			$ref: context.$ref(),
			$path: 'payload',
			$type: 'undefined',
			payload: undefined
		};
	}

	return {
		$ref: context.$ref(),
		$path: 'payload',
		$type: getConstructors(content),
		payload: content
	};
}

/** */
function prepareResponse (context, content) {
	if (content && (content instanceof Date)) {
		return prepareScalarResponse(context, content);
	}
	if (_.isArray(content)) {
		return prepareScalarResponse(context, content);
	}
	if (_.isObject(content)) {
		return prepareObjectResponse(context, content);
	}
	return prepareScalarResponse(context, content);
}

function _parseExceptionProperty (key, value) {
	if (key === 'stack') {
		return _.split(value, "\n");
	}
	return _.cloneDeep(value);
}

/** */
function prepareErrorResponse (context, code, message, exception) {

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
		$ref: context.$ref(),
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

function _getIdentity (req, commonName) {
	const unverifiedUser_ = req.unverifiedUser ? '~' + req.unverifiedUser : '';
	////debug.log('unverifiedUser_ = ', unverifiedUser_);
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

const NS_PER_SEC = 1e9;

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

	$getTimeDiff () {
		let diff;
		const hrtime = this.time;
		if (hrtime) {
			diff = process.hrtime(hrtime);
			return (diff[0] * NS_PER_SEC + diff[1]) / 1000000;
		}
	}

}

/** */
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
