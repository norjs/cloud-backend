/**
 * @module
 */

import Q from 'q';

function _closeRequest (req, listeners, reject) {
	if (listeners.error) req.removeListener('error', listeners.error);
	if (listeners.end) req.removeListener('end', listeners.end);
	req.connection.destroy();
	reject(new Error("Too much POST data detected. Connection closed."));
}

function _endListener (body, req, listeners, resolve) {
	if (listeners.error) req.removeListener('error', listeners.error);
	resolve(body);
}

function _errorListener (err, req, listeners, reject) {
	req.removeListener('end', listeners.end);
	reject(err);
}

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
export default function parseRequestData (req) {
	return Q.Promise((resolve, reject) => _parseRequestData(req, resolve, reject));
}
