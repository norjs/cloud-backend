
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

	_.forEach(methods, method => {
		body[method] = prepareFunctionResponse(context, content[method], context.$ref(method));
	});

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

	_.forEach(members, member => {
		body[member] = _.cloneDeep(content[member]);
	});

	_.forEach(methods, method => {
		body[method] = prepareFunctionResponse(context, content[method], context.$ref(method));
	});

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

	getAllKeys(f).filter(notPrivate).filter(key => {
		if(key === 'arguments') return false;
		if(key === 'caller') return false;
		return true;
	}).filter(key => notFunction(f[key])).forEach(key => {
		body[key] = f[key];
	});

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
		_.forEach(getAllKeys(exception).filter(notPrivate).filter(notFunction), key => {
			if (key === 'stack') {
				body.exception[key] = _.split(exception[key], "\n");
			} else {
				body.exception[key] = exception[key];
			}
		});
	}

	return body;
}

/** */
export function createContext (req) {

	const remoteAddress = _.get(req, 'connection.remoteAddress');
	const peerCert = req.socket && req.socket.getPeerCertificate && req.socket.getPeerCertificate();
	const commonName = _.get(peerCert, 'subject.CN');
	const method = _.toLower(req.method);
	const url = req.url;
	//const unverifiedUser = req.unverifiedUser;
	const user = req.user;

	const $getIdentity = () => {
		const unverifiedUser_ = req.unverifiedUser ? '~' + req.unverifiedUser : '';
		//debug.log('unverifiedUser_ = ', unverifiedUser_);
		const user_ = req.user ? '' + req.user : unverifiedUser_;
		//debug.log('user_ = ', user_);
		return (commonName ? '+' + commonName : user_);
	};

	const $getBody = () => parseRequestData(req);

	const $ref = basePath => {
		if (basePath) {
			return ref(req, url, basePath);
		}
		return ref(req, url);
	};

	return {
		remoteAddress,
		peerCert,
		commonName,
		user,
		method,
		url,
		$getBody,
		$ref,
		$getIdentity
	};
}
