/** HTTP/HTTPS requests */

import _ from 'lodash';
import is from 'nor-is';
import debug from 'nor-debug';
import Q from 'q';
import { HTTPError } from 'nor-errors';
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
export function getRequest (url) {
	return _request("get", url);
}

/** POST request */
export function postRequest (url, data) {
	return _request("post", url, data);
}
