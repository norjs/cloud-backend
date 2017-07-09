
import _ from 'lodash';
//import is from 'nor-is';
import Q from 'q';
import debug from 'nor-debug';
//import ref from 'nor-ref';
import { HTTPError } from 'nor-errors';
import { createBodyIDs } from '@sendanor/cloud-common';
import moment from 'moment';

//const isProduction = process.env.NODE_ENV === 'production';
//const isDevelopment = !isProduction;

import { createContext } from './responses.js';
import { prepareErrorResponse } from './responses.js';

/** Send a reply in JSON format */
function jsonReply (content) {
	return JSON.stringify(content, null, 2) + "\n";
}

const NS_PER_SEC = 1e9;

/** Send a response */
function reply (context, res, body, status=200) {
	debug.assert(status).is('number');
	res.writeHead(status);

	const method = context.method.toUpperCase();
	if (method === 'HEAD') {
		res.end();
	} else {
		res.end( jsonReply(body) );
	}

	// Logging
	let diff;
	const hrtime = context.$getTime();
	//debug.log('hrtime = ', hrtime);
	let time;
	if (hrtime) {
		diff = process.hrtime(hrtime);
		time = (diff[0] * NS_PER_SEC + diff[1]) / 1000000;
	}
	const identity = context.$getIdentity();
	console.log(moment().format() + ' [' + (identity ? identity + '@' : '') + context.remoteAddress+'] ' + method + ' ' + status + ' ' + context.url + ' ['+time+']');
}

/** */
function _coreRequestResponseHandler (req, res, body) {
	//console.log('body = ', body);

	const context = createContext(req);

	const type = body && body.$type || '';
	const isError = type === 'error';
	const statusCode = _.get(body, '$statusCode') || 200;

	if ( (!isError) && (statusCode >= 200) && (statusCode < 300) ) {
		const hash = body && body.$hash || '';
		const ifNoneMatch = req.headers['if-none-match'] || '';
		//debug.log('headers = "' + Object.keys(req.headers) + '"');
		//debug.log('ifNoneMatch = "' + ifNoneMatch + '"');

		if (ifNoneMatch && hash && (ifNoneMatch === hash)) {
			return reply(context, res, {}, 304); // Not Modified
		}

		if (hash) {
			res.setHeader('Cache-Control', 'private, max-age=31557600');
			res.setHeader("ETag", hash);
		}
	}

	return reply(context, res, body, statusCode);
}

/** */
function _coreRequestHandlerWithoutErrorHandling (req, res, next) {
	return Q.when(next(req, res)).then(body => _coreRequestResponseHandler(req, res, body));
}

function unexpectedErrorHandler (err) {
	debug.error('Unexpected error while handling error:', err);
}

function _standardErrorHandler (err, context, res) {

	if (err instanceof HTTPError) {
		return reply(context, res, prepareErrorResponse(context, err.code, err.message, err), err.code);
	}

	debug.error('Error: ', err);
	const code = 500;
	const error = "Internal Service Error";
	return reply(context, res, prepareErrorResponse(context, code, error, err), code);
}

function _coreRequestHandler (req, res, next) {
	const hrtime = process.hrtime();
	const context = createContext(req);
	context.$setTime(hrtime);
	return Q.fcall(() => _coreRequestHandlerWithoutErrorHandling(req, res, next)).fail(err => _standardErrorHandler(err, context, res)).fail(unexpectedErrorHandler);
}

/** Build a HTTP(s) request handler. This handler handles the core functionality; exception handling, etc.
 * @param next {Function} The application request handler, which might throw exceptions and returns promises.
 * @returns {Function} A Function which takes (req, res) arguments, handles exceptions, and forwards anything else to `next`.
 */
export default function coreRequestHandler (next) {
	return (req, res) => _coreRequestHandler(req, res, next);
}
