import _ from 'lodash';
//import Service from './Service';
import is from 'nor-is';
import debug from 'nor-debug';
//import uuidv4 from 'uuid/v4';
import Q from 'q';
import { HTTPError } from 'nor-errors';
import reserved from 'reserved-words';
import globals from 'globals';

import URL from 'url';

import LazyProtocolPicker from './LazyProtocolPicker.js';

const protocolPicker = new LazyProtocolPicker();

/** */
function _parse_url (url) {
	return URL.parse(url, true);
}

function _parseProtocol (protocol) {
	protocol = protocol || 'http';
	if (protocol[protocol.length-1] === ':') {
		return protocol.substr(0, protocol.length - 1 );
	}
	return protocol;
}

/** */
function _request (method, url, body) {
	return Q.fcall( () => {
		method = _.toLower(method);

		debug.log('method = ', method)
		debug.log('url = ', url)

		const options = _parse_url(url);
		debug.log('options = ', options);
		debug.assert(options).is('object');

		options.method = method;

		let defer = Q.defer();

		const protocol = _parseProtocol(options.protocol);

		debug.log('protocol = ', protocol);

		const protocolImplementation = protocolPicker[protocol];

		if (!protocolImplementation) throw new Error("No implementation detected for " + protocol);

		const req = protocolImplementation.request(options);

		let responseListener;

		/** Error event listener */
		const errorListener = err => {
			defer.reject(err);
			req.removeListener('response', responseListener);
		};

		/** Response event listener */
		responseListener = res => {
			debug.log('got response!');

			//let redirectLoopCounter = 10;

			let buffer = "";

			const dataListener = chunk => buffer += chunk;

			const endListener = () => defer.resolve( Q.fcall(() =>{

				res.removeListener('data', dataListener);

				let contentType = res.headers['content-type'] || undefined;

				debug.log('contentType = ', contentType);

				const statusCode = res.statusCode;
				debug.log('statusCode = ', statusCode);

				// Support for redirections
				//if ( (statusCode >= 301) && (statusCode <= 303) ) {
				//
				//	if (redirectLoopCounter < 0) {
				//		throw new Error('Redirect loop detected');
				//	}
				//
				//	redirectLoopCounter -= 1;
				//
				//	return request(res.headers.location, {
				//		'method': 'GET',
				//		'headers': {
				//			'accept': opts.url.headers && opts.url.headers.accept
				//		}
				//	});
				//}

				if ( (!contentType) && buffer[0] === '{') {
					contentType = 'application/json';
				}

				if (!((statusCode >= 200) && (statusCode < 400))) {
					throw new HTTPError(statusCode, ((contentType === 'application/json') ? JSON.parse(buffer) : buffer) );
				}

				return (contentType === 'application/json') ? JSON.parse(buffer) : buffer;
			}));

			res.setEncoding('utf8');
			res.on('data', dataListener);
			res.once('end', endListener);
			req.removeListener('error', errorListener);

		};

		// Register listeners
		req.once('error', errorListener);
		req.once('response', responseListener);

		if (body && (method !== 'get')) {
			const buffer = is.string(body) ? body : JSON.stringify(body);
			req.end( buffer, 'utf8' );
		} else {
			req.end();
		}

		return defer.promise;
	});
}

/** GET request */
function getRequest (url) {
	return _request("get", url);
}

/** POST request */
function postRequest (url, data) {
	return _request("post", url, data);
}

/** */
function parse_type (type) {

	if (is.array(type)) {
		return type;
	}

	if (is.string(type)) {
		return [type];
	}

	return [];
}

/** Check if reserved word in ES6 */
function isReservedWord (name) {
	if (reserved.check(name, 6)) {
		return true;
	}
	return globals.es6[name] !== undefined;
}

/** */
function isValidName (name) {
	return is.string(name) && is.pattern(name, /^[a-zA-Z$_][a-zA-Z0-9$_]*$/);
}

function assertValidName (name) {
	if (!isValidName(name)) {
		throw new TypeError("Name is not a valid name: "+name);
	}
	if (isReservedWord(name)) {
		throw new TypeError("Name is a reserved word: "+name);
	}
}

/** */
function isValidClassName (name) {
	return is.string(name) && is.pattern(name, /^[a-zA-Z][a-zA-Z0-9$_]*$/);
}

function assertValidClassName (className) {
	if (!isValidClassName(className)) {
		throw new TypeError("Class name is not a valid name: "+className);
	}
	if (isReservedWord(className)) {
		throw new TypeError("Class name is a reserved word: "+className);
	}
}

/** Parse payload from backend */
const parsePayload = result => {
	debug.assert(result).is('object');
	const payloadType = result.$type;
	const payloadPath = result.$path;
	const payload = payloadPath ? _.get(result, payloadPath) : result;
	if (payloadType === "Date") {
		return new Date(payload);
	}
	return payload;
}

/** */
function buildCloudClass (url) {
	return getRequest(url).then( body => {
		debug.log('body = ', body);

		debug.assert(body).is('object');

		let methods = [];
		let properties = [];

		Object.keys(body).forEach(key => {
			assertValidName(key);
			const value = body[key];
			const isMethod = is.object(value) && value.$type === 'Function';
			(isMethod ? methods : properties).push(key);
		});

		const setupStaticData = self => {
			_.forEach(properties, key => self[key] = _.cloneDeep(body[key]));
		};

		let Class;
		const types = parse_type(body.$type);
		if (types.length === 0) {
			Class = class {};
		} else if (types.length === 1) {
			const className = _.first(types);
			assertValidClassName(className);
			Class = (new Function("return class "+className+" {}"))();
		} else {
			const firstClassName = _.first(types);
			Class = _.reduceRight(types, (Base, className) => {
				assertValidClassName(className);
				if (Base === undefined) {
					return (new Function("setup", "return class "+className+" { constructor() { } }"))(setupStaticData);
				}
				debug.assert(Base).is('function');
				if (firstClassName === className) {
					return (new Function("Base", "setup", "return class "+className+" extends Base { constructor() { super(); setup(this); } }"))(Base, setupStaticData);
				} else {
					return (new Function("Base", "return class "+className+" extends Base { constructor() { super(); } }"))(Base);
				}
			}, undefined);
		}

		// Add prototype methods
		_.forEach(methods, key => {
			const baseUrl = body.$ref || url;
			const methodUrl = (baseUrl && (baseUrl.length >= 1) && (baseUrl[baseUrl.length-1] === '/')) ? baseUrl + key : baseUrl + '/' + key;
			Class.prototype[key] = (...$args) => postRequest(methodUrl, {$args}).then(parsePayload);
		});

		return Class;
	} );
}

export default buildCloudClass;
