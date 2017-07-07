
import _ from 'lodash';
import is from 'nor-is';
import Q from 'q';
import debug from 'nor-debug';
import ref from 'nor-ref';
import { HTTPError } from 'nor-errors';
import { createBodyIDs } from '../cloud-common/id.js'

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

const reservedPropertyNames = [
	'constructor',
	'hasOwnProperty',
	'toString',
	'toLocaleString',
	'valueOf',
	'isPrototypeOf',
	'propertyIsEnumerable',
	'prototype'
];

/** */
const _isReservedPropertyName = name => _.indexOf(reservedPropertyNames, name) >= 0;

/** Send a reply in JSON format */
const jsonReply = content => {
	return JSON.stringify(content, null, 2) + "\n";
};

/** Send a response */
const reply = (res, body, status=200) => {
	debug.assert(status).is('number');
	res.writeHead(status);
	res.end( jsonReply(body) );
};

/** Returns true if the keyword is a private */
const _isPrivate = name => {
	if (!name) return;
	name = _.trim(name);
	const firstLetter = name[0];
	if (firstLetter === '$') return true;
	if (firstLetter === '_') return true;
	return !!_isReservedPropertyName(name);
};

const _notPrivate = name => !_isPrivate(name);

const _isFunction = name => is.function(name);
const _notFunction = name => !_isFunction(name);

/** Returns an array of all keys (own or not) of an object */
const _getAllKeys = obj => {
	let r = [];
	//for (let key in obj) r.push(key);
	do {
		r = r.concat(Object.getOwnPropertyNames(obj));
	} while (obj = Object.getPrototypeOf(obj));
	return _.uniq(r);
};

/** Returns an array of all constuctors of an object, without the "Object", or a string if there is only one. */
const _getConstructors = obj => {
	let r = [];
	//for (let key in obj) r.push(key);
	while (obj = Object.getPrototypeOf(obj)) {
		r.push(_.get(obj, 'constructor.name'));
	}

	//debug.log('constructors = ', r);

	if ( (_.last(r) === 'Object') && (r.length >= 2) )  {
		r.length -= 1;
	}

	if (r.length === 1) {
		r = _.first(r);
	}

	return r;
};

/** */
const _prepareObjectPrototypeResponse = (context, content) => {
	const properties = _getAllKeys(content).filter(_notPrivate);
	const methods = _.filter(properties, key => is.func(content[key]));

	//debug.log("content = ", content);
	//debug.log("methods = ", methods);
	//debug.log("members = ", members);
	//debug.log("properties = ", properties);

	const $name = _.get(content, 'constructor.name');

	let body = {
		$id: null,
		$hash: null,
		$ref: context.$ref(),
		$name,
		$type: [$name].concat(_getConstructors(content))
	};

	_.forEach(methods, method => {
		body[method] = {
			$type: 'Function',
			$method: 'post',
			$ref: context.$ref(method)
		};
	});

	let id, hash;
	[id, hash] = createBodyIDs(body);

	body.$id = id;
	body.$hash = hash;

	return body;
};

/** */
const _prepareObjectResponse = (context, content) => {

	const properties = Object.getOwnPropertyNames(content).filter(_notPrivate);
	const methods = _.filter(properties, key => is.func(content[key]));

	const allProperties = _getAllKeys(content).filter(_notPrivate);
	const members = _.filter(allProperties, key => !is.func(content[key]));

	//debug.log("content = ", content);
	//debug.log("methods = ", methods);
	//debug.log("members = ", members);
	//debug.log("properties = ", properties);

	let body = {
		$id: null,
		$hash: null,
		$ref: context.$ref(),
		$type: _getConstructors(content)
	};

	_.forEach(members, member => {
		body[member] = _.cloneDeep(content[member]);
	});

	_.forEach(methods, method => {
		body[method] = {
			$type: 'Function',
			$method: 'post',
			$ref: context.$ref(method)
		};
	});

	let id, hash;
	[id, hash] = createBodyIDs(body);

	body.$id = id;
	body.$hash = hash;

	const proto = Object.getPrototypeOf(content);
	const name = proto && _.get(proto, 'constructor.name');
	if (proto && (name !== 'Object')) {
		body.$prototype = _prepareObjectPrototypeResponse(context, proto);
	}

	return body;
};

/** */
const _prepareScalarResponse = (context, content) => {
	//debug.log("content = ", content);
	let body = {
		$ref: context.$ref(),
		$path: 'payload',
		$type: _getConstructors(content),
		payload: content
	};

	if (is.function(content)) {
		delete body.$path;
		body.$method = 'post';
		_getAllKeys(content).filter(_notPrivate).filter(key => {
			if(key === 'arguments') return false;
			if(key === 'caller') return false;
			return true;
		}).filter(key => _notFunction(content[key])).forEach(key => {
			body[key] = content[key];
		});
	}

	return body;
};

/** */
const _prepareResponse = (context, content) => {
	if (content && (content instanceof Date)) {
		return _prepareScalarResponse(context, content);
	}
	if (is.array(content)) {
		return _prepareScalarResponse(context, content);
	}
	if (is.object(content)) {
		return _prepareObjectResponse(context, content);
	}
	return _prepareScalarResponse(context, content);
};

/** */
const _prepareErrorResponse = (context, code, message, exception) => {

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
			$type: _getConstructors(exception)
		};
		_.forEach(_getAllKeys(exception).filter(_notPrivate).filter(_notFunction), key => {
			if (key === 'stack') {
				body.exception[key] = _.split(exception[key], "\n");
			} else {
				body.exception[key] = exception[key];
			}
		});
	}

	return body;
};

/** */
const parseRequestData = req => {
	return Q.Promise((resolve, reject) => {

		let errorListener, endListener;
		let body = '';

		const dataListener = data =>{

			body += data;

			// Too much POST data, kill the connection!
			// 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
			if (body.length > 1e6) {
				req.removeListener('error', errorListener);
				req.removeListener('end', endListener);
				req.connection.destroy();
				reject(new Error("Too much POST data detected. Connection closed."));
			}
		};

		endListener = () =>{
			req.removeListener('error', errorListener);
			resolve(body);
		};

		errorListener = err =>{
			req.removeListener('end', endListener);
			reject(err);
		};

		req.on('data', dataListener);
		req.once('end', endListener);
		req.once('error', errorListener);

	});
};

/** */
const _createContext = req => {

	const remoteAddress = _.get(req, 'connection.remoteAddress');
	const peerCert = req.socket && req.socket.getPeerCertificate && req.socket.getPeerCertificate();
	const commonName = _.get(peerCert, 'subject.CN');
	const method = _.toLower(req.method);
	const url = req.url;

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
		method,
		url,
		$getBody,
		$ref
	};
};

/** Splits an URL string into parts (an array) */
const _splitURL = url => {
	url = _.trim(url);
	if (!url) return [];
	if (url[0] === '/') url = _.trim(url.substr(1));
	if (!url) return [];
	let parts = _.split(url, '/');
	if( _.last(parts) === '' ) {
		parts.length = parts.length - 1;
	}
	return parts;
};

/** Recursively get content */
const _getContent = (context, content, parts) => {
	debug.assert(parts).is('array');

	//debug.log('_getContent(', content, ', ', parts, ')');

	if (parts.length === 0) return content;

	const part = parts.shift();
	//debug.log('part =', part);

	if (_isPrivate(part)) return;

	debug.assert(content).is('object');

	const value = content[part];
	//debug.log('value = ', value);

	if (is.function(value)) {
		const method = context.method;
		if (method === 'post') {
			return context.$getBody().then(body => {
				body = JSON.parse(body);
				const args = (body && body.$args) || [];
				debug.assert(args).is('array');
				return _getContent(context, content[part](...args), parts);
			});
		} else if (method === 'get') {
			return _getContent(context, content[part], parts);
		} else {
			throw new HTTPError(405);
		}
	} else {
		return _getContent(context, value, parts);
	}
};

/** */
const _serviceRequestHandler = (content, req) => {
	return Q.fcall(() => {

		const context = _createContext(req);
		//debug.log('Created context: ', context);

		console.log(new Date() + ' | ' + context.remoteAddress +' | ' + context.commonName +' | ' + context.method +' | ' + context.url);

		const parts = _splitURL(context.url);

		return Q.when(_getContent(context, content, parts)).then(subContent => {
			if (subContent !== undefined) {
				return _prepareResponse(context, subContent);
			} else {
				return _prepareErrorResponse(context, 404, 'Not Found');
			}
		});

	});
};

/** Build a HTTP(s) request handler for a MicroService */
const serviceRequestHandler = (serviceName, getInstance) => {
	debug.assert(serviceName).is('string');
	debug.assert(getInstance).is('function');
	return (req, res) => {
		debug.log('serviceName = ', serviceName);
		return Q.fcall(() => {

			return Q.when(getInstance(serviceName)).then(serviceInstance => {

				if (is.array(serviceInstance)) {
					serviceInstance = _.first(serviceInstance);
				}

				debug.assert(serviceInstance).is('object');

				return Q.when(_serviceRequestHandler(serviceInstance, req)).then(body => {
					console.log('body = ', body);
					const type = body && body.$type || '';
					const isError = type === 'error';
					const statusCode = _.get(body, '$statusCode') || 200;
					return reply(res, body, statusCode);
				});
			});

		}).fail(err => {
			debug.error('Error: ', err);
			const code = 500;
			const error = "Internal Service Error";
			return reply(res, _prepareErrorResponse(_createContext(req), code, error, err), code);
		}).fail(err => {
			debug.error('Unexpected error while handling error:', err);
		});

	};
};

export default serviceRequestHandler;