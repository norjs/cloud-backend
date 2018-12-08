/**
 * @module @norjs/cloud-backend
 */

import Async from '../../Async.js';

/**
 *
 * @param req
 * @param listeners
 * @param reject
 * @private
 */
function _closeRequest (req, listeners, reject) {
	if (listeners.error) req.removeListener('error', listeners.error);
	if (listeners.end) req.removeListener('end', listeners.end);
	req.connection.destroy();
	reject(new Error("Too much POST data detected. Connection closed."));
}

/**
 *
 * @param body
 * @param req
 * @param listeners
 * @param resolve
 * @private
 */
function _endListener (body, req, listeners, resolve) {
	if (listeners.error) req.removeListener('error', listeners.error);
	resolve(body);
}

/**
 *
 * @param err
 * @param req
 * @param listeners
 * @param reject
 * @private
 */
function _errorListener (err, req, listeners, reject) {
	req.removeListener('end', listeners.end);
	reject(err);
}

/**
 *
 * @param req
 * @param resolve
 * @param reject
 * @private
 */
function _parseRequestData (req, resolve, reject) {
	let body = '';

	let listeners = {
		data: data => {
			body += data;
			if (body.length > 1e6) _closeRequest(req, listeners, reject);
		},
		end: () => _endListener(body, req, listeners, resolve),
		error: err => _errorListener (err, req, listeners, reject)
	};

	req.on('data', listeners.data);
	req.once('end', listeners.end);
	req.once('error', listeners.error);
}

/** */
function parseRequestData (req) {
	return Async.Promise((resolve, reject) => _parseRequestData(req, resolve, reject));
}

export default parseRequestData;