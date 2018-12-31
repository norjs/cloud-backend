/**
 * @module @norjs/cloud-backend
 */

import _ from 'lodash';
import Async from '../../Async.js';
import debug from '@norjs/debug';
import { HTTPError } from '@norjs/errors';
import { createBodyIDs } from '@norjs/cloud-common';
import moment from 'moment';
import querystring from 'querystring';

//const isProduction = process.env.NODE_ENV === 'production';
//const isDevelopment = !isProduction;

import { createContext } from './responses.js';
import { prepareErrorResponse } from './responses.js';

const NS_PER_SEC = 1e9;
const longPollingWatchDelay = parseInt(process.env.CLOUD_CLIENT_LONG_POLLING_SERVER_WATCH_DELAY || 500, 10); // ms

/** Send a reply in JSON format */
function jsonReply2 (content, counter) {
	try {
		return JSON.stringify(content);
	} catch (err) {

		if (! (err && err.message && err.message.indexOf('Converting circular structure to JSON') >= 0) ) {
			throw err;
		}

		if (!_.isObject(content)) {
			throw err;
		}

		counter += 1;
		if (counter >= 2) {
			return '"Stringify Error: Circular structure detected"';
		}

		return '{' + _.map( Object.keys(content), key => '' + jsonReply2(key, counter) + ': ' + jsonReply2(content[key], counter) ).join(', ') + '}';
	}
}

/** Send a reply in JSON format */
function jsonReply (content) {
	try {
		return JSON.stringify(content, null, 2) + "\n";
	} catch (err) {

		if (! (err && err.message && err.message.indexOf('Converting circular structure to JSON') >= 0) ) {
			throw err;
		}

		if (!_.isObject(content)) {
			throw err;
		}

		return '{' + _.map( Object.keys(content), key =>  '' + jsonReply2(key, 0) + ': ' + jsonReply2(content[key], 0) ).join(', ') + '}';
	}
}

/** Send a response */
function reply (context, res, body, status=200) {
	//debug.assert(req).is('object');
	//debug.assert(_.get(req, 'constructor.name')).is('string').equals('IncomingMessage');

	debug.assert(res).is('object');
	debug.assert(_.get(res, 'constructor.name')).is('string').equals('ServerResponse');

	debug.assert(status).is('number');
	res.writeHead(status);

	const method = context.method.toUpperCase();
	if ((!body) || (method === 'HEAD')) {
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
	return Async.Promise( resolve => setTimeout(() => resolve(Async.fcall(f)), time) );
}

/**
 *
 * @param req
 * @param res
 * @param body
 * @param next
 * @private
 */
function _coreRequestResponseHandler (req, res, body, next) {

	debug.assert(req).is('object');
	debug.assert(_.get(req, 'constructor.name')).is('string').equals('IncomingMessage');

	debug.assert(res).is('object');
	debug.assert(_.get(res, 'constructor.name')).is('string').equals('ServerResponse');

	//console.log('body = ', body);
	//debug.log('0');

	const context = createContext(req);

	//debug.log('1');

	const type = body && body.$type || '';
	const isError = type === 'error';
	const statusCode = _.get(body, '$statusCode') || 200;

	if ( (!isError) && (statusCode >= 200) && (statusCode < 300) ) {
		const hash = body && body.$hash || '';
		const preferStr = req.headers['prefer'] || '';
		const prefer = preferStr && querystring.parse(preferStr, ';');
		const preferWait = prefer && prefer.wait ? parseInt(prefer.wait, 10) : undefined;
		const ifNoneMatch = req.headers['if-none-match'] || '';
		////debug.log('headers = "' + Object.keys(req.headers) + '"');
		////debug.log('ifNoneMatch = "' + ifNoneMatch + '"');

		if (ifNoneMatch && hash && (ifNoneMatch === hash)) {

			const $statusCode = 304;

			// If user prefers to wait, let's wait. FIXME: Implement return sooner if conditions change.
			if (preferWait) {
				const time = context.$getTimeDiff();
				if (time/1000 < preferWait) {
					//debug.log('2');
					return setTimeoutPromise(() => _coreRequestHandlerWithoutErrorHandling(req, res, next), longPollingWatchDelay);
				}
			}

			//debug.log('3');
			return reply(context, res, null, $statusCode); // Not Modified
		}

		if (hash) {
			res.setHeader('Cache-Control', 'private, max-age=31557600');
			res.setHeader("ETag", hash);
		}

	}

	//debug.log('4');
	return reply(context, res, body, statusCode);
}

/**
 *
 * @param req
 * @param res
 * @param next
 * @returns {Promise.<TResult>|*}
 * @private
 */
function _coreRequestHandlerWithoutErrorHandling (req, res, next) {

	debug.assert(req).is('object');
	debug.assert(_.get(req, 'constructor.name')).is('string').equals('IncomingMessage');

	debug.assert(res).is('object');
	debug.assert(_.get(res, 'constructor.name')).is('string').equals('ServerResponse');

	return Async.fcall( () => next() ).then(body => _coreRequestResponseHandler(req, res, body, next));
}

/**
 *
 * @param err
 */
function unexpectedErrorHandler (err) {
	debug.error('Unexpected error while handling error:', err);
}

/**
 *
 * @param err
 * @param context
 * @param res
 * @private
 */
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
 * @param req {IncomingMessage} Node.js request object
 * @param res {ServerResponse} Node.js response object
 * @param next {Function} A callback to tell if we should move to next middleware
 * @returns {Promise}
 */
function coreRequestHandler (req, res, next) {

	debug.assert(req).is('object');
	debug.assert(_.get(req, 'constructor.name')).is('string').equals('IncomingMessage');
	debug.assert(res).is('object');
	debug.assert(_.get(res, 'constructor.name')).is('string').equals('ServerResponse');
	debug.assert(next).is('function');

	const hrtime = process.hrtime();
	const context = createContext(req);
	context.$setTime(hrtime);

	// Enable CORS
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,prefer,if-none-match');
	res.setHeader('Access-Control-Allow-Credentials', true);

	return Async.fcall(
		() => _coreRequestHandlerWithoutErrorHandling(req, res, next)
	).catch(err => {
		//console.log('err =', JSON.stringify(err));
		return _standardErrorHandler(err, context, res);
	}).catch(unexpectedErrorHandler);
}

export default coreRequestHandler;
