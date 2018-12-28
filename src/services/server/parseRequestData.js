/**
 * @module @norjs/cloud-backend
 */

import {
	_
	, Async
} from '../../lib/index.js';

const ERRORS = {
	MAX_LIMIT: "Too much POST data detected. Connection closed.",
	DEFAULT: "Unknown error"
};

/**
 *
 * @param f {function}
 * @param reject {function}
 * @returns {*}
 */
function handleErrors (f, reject) {
	try {
		return f();
	} catch (err) {
		reject(err);
	}
}

/**
 *
 * @param req {{removeListener: function, connection: {destroy: function}}}
 * @param listeners {{error: function, end: function}}
 * @param reject {function}
 * @param error {*}
 * @private
 */
function _closeRequest (req, listeners, reject, error) {
	if (listeners.error) req.removeListener('error', listeners.error);
	if (listeners.end) req.removeListener('end', listeners.end);
	req.connection.destroy();
	if (_.isString(error)) {
		reject(new Error(error));
	} else {
		reject(error);
	}
}

/**
 *
 * @param body {string|Buffer}
 * @param req {{removeListener: function}}
 * @param listeners {{error: function}}
 * @param resolve {function}
 * @private
 */
function _endListener (body, req, listeners, resolve) {
	if (listeners.error) req.removeListener('error', listeners.error);
	resolve(body);
}

/**
 *
 * @param err {*}
 * @param req {{removeListener: function}}
 * @param listeners {{end: function}}
 * @param reject {function}
 * @private
 */
function _errorListener (err, req, listeners, reject) {
	req.removeListener('end', listeners.end);
	reject(err);
}

/**
 * Read response data into a string body.
 *
 * @param req {{on: function, once: function, removeListener: function, connection: {destroy: function}}}
 * @param resolve {function}
 * @param reject {function}
 * @param limit {number} The maximum response data
 * @private
 */
function _parseStringRequestData (req, resolve, reject, {limit = 1e6} = {}) {
	handleErrors(()=> {

		let body = '';

		let listeners = {
			data: data => {
				handleErrors(()=> {
					body += data;
					if (body.length > limit) _closeRequest(req, listeners, reject, ERRORS.MAX_LIMIT);
				}, (err) => {
					_closeRequest(req, listeners, reject, err);
				});
			},
			end: () => {
				handleErrors(()=> {
					_endListener(body, req, listeners, resolve);
				}, (err) => {
					_closeRequest(req, listeners, reject, err);
				});
			},
			error: err => _errorListener (err, req, listeners, reject)
		};

		req.on('data', listeners.data);
		req.once('end', listeners.end);
		req.once('error', listeners.error);

	}, reject);
}

/**
 * Read binary data into a buffer body.
 *
 * @param req {{setEncoding:function, on: function, once: function, removeListener: function, connection: {destroy: function}}}
 * @param resolve {function}
 * @param reject {function}
 * @param limit {number} The maximum response data
 * @private
 */
function _parseBinaryRequestData (req, resolve, reject, {limit = 1e6} = {}) {
	handleErrors( () => {

		let length = 0;
		let body = [];

		let listeners = {
			data: data => {
				handleErrors(()=> {
					length += data.length;
					if (length > limit) _closeRequest(req, listeners, reject, ERRORS.MAX_LIMIT);
					else body.push(data);
				}, (err) => {
					_closeRequest(req, listeners, reject, err);
				});
			},
			end: () => {
				handleErrors(()=> {
					_endListener(Buffer.concat(body), req, listeners, resolve);
				}, (err) => {
					_closeRequest(req, listeners, reject, err);
				});
			},
			error: err => _errorListener (err, req, listeners, reject)
		};

		req.on('data', listeners.data);
		req.once('end', listeners.end);
		req.once('error', listeners.error);

	}, reject);
}

/**
 * Parses request data
 * @param req {{setEncoding:function, on: function, once: function, removeListener: function, connection: {destroy: function}}}
 * @param type {string} Either `"string"` or `"binary"`
 * @param limit {number} The maximum response data limit
 * @return {*}
 */
function parseRequestData (req, {type = 'string', limit = 1e6}) {
	switch(type) {
	case 'string': return Async.Promise((resolve, reject) => _parseStringRequestData(req, resolve, reject, {limit}));
	case 'binary': return Async.Promise((resolve, reject) => _parseBinaryRequestData(req, resolve, reject, {limit}));
	default: throw new TypeError("Unknown type: " + type);
	}
}

export default parseRequestData;