
import _ from 'lodash';
//import is from 'nor-is';
import Q from 'q';
import debug from 'nor-debug';
//import ref from 'nor-ref';
import { HTTPError } from 'nor-errors';
import { createBodyIDs } from '@sendanor/cloud-common';
import moment from 'moment';
import querystring from 'querystring';

//const isProduction = process.env.NODE_ENV === 'production';
//const isDevelopment = !isProduction;

import { createContext } from './responses.js';
import { prepareErrorResponse } from './responses.js';

const NS_PER_SEC = 1e9;
const longPollingWatchDelay = parseInt(process.env.CLOUD_CLIENT_LONG_POLLING_SERVER_WATCH_DELAY || 500, 10); // ms

/** Send a reply in JSON format */
function jsonReply (content) {
	return JSON.stringify(content, null, 2) + "\n";
}

/** Send a response */
function reply (context, res, body, status=200) {
	debug.assert(status).is('number');
	res.writeHead(status);

	const method = context.method.toUpperCase();
	if ((!body) || (method === 'HEAD') || (meth)) {
		res.end();
	} else {
		res.end( jsonReply(body) );
	}

	// Logging
	const time = context.$getTimeDiff();
	const identity = context.$getIdentity();
	console.log(moment().format() + ' [' + (identity ? identity + '@' : '') + context.remoteAddress+'] ' + method + ' ' + status + ' ' + context.url + ' ['+time+']');
}

function setTimeoutPromise (f, time) {
	return Q.Promise( resolve => setTimeout(() => resolve(Q.fcall(f)), time) );
}

/** */
function _coreRequestResponseHandler (req, res, body, next) {
	//console.log('body = ', body);
	const context = createContext(req);

	const type = body && body.$type || '';
	const isError = type === 'error';
	const statusCode = _.get(body, '$statusCode') || 200;

	if ( (!isError) && (statusCode >= 200) && (statusCode < 300) ) {
		const hash = body && body.$hash || '';
		const preferStr = req.headers['prefer'] || '';
		const prefer = preferStr && querystring.parse(preferStr, ';');
		const preferWait = prefer && prefer.wait ? parseInt(prefer.wait, 10) : undefined;
		const ifNoneMatch = req.headers['if-none-match'] || '';
		//debug.log('headers = "' + Object.keys(req.headers) + '"');
		//debug.log('ifNoneMatch = "' + ifNoneMatch + '"');

		if (ifNoneMatch && hash && (ifNoneMatch === hash)) {

			const $statusCode = 304;

			// If user prefers to wait, let's wait. FIXME: Implement return sooner if conditions change.
			if (preferWait) {
				const time = context.$getTimeDiff();
				if (time/1000 < preferWait) {
					return setTimeoutPromise(() => _coreRequestHandlerWithoutErrorHandling(req, res, next), longPollingWatchDelay);
				}
			}

			return reply(context, res, null, $statusCode); // Not Modified
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
	return Q.when(next(req, res)).then(body => _coreRequestResponseHandler(req, res, body, next));
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

/** Build a HTTP(s) request handler. This handler handles the core functionality; exception handling, etc.
 * @param req {Object} Node.js request object
 * @param res {Object} Node.js response object
 * @param next {Function} A callback to tell if we should move to next middleware
 * @returns {Promise}
 */
export default function coreRequestHandler (req, res, next) {

	debug.assert(req).is('object');
	debug.assert(res).is('object');
	debug.assert(next).is('function');

	const hrtime = process.hrtime();
	const context = createContext(req);
	context.$setTime(hrtime);

	// Enable CORS
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,prefer,if-none-match');
	res.setHeader('Access-Control-Allow-Credentials', true);

	return Q.fcall(() => _coreRequestHandlerWithoutErrorHandling(req, res, next)).fail(err => _standardErrorHandler(err, context, res)).fail(unexpectedErrorHandler);
}
