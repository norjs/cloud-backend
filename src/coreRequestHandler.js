
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

/** Send a response */
function reply (context, res, body, status=200) {
	const identity = context.$getIdentity();
	console.log(moment().format() + ' [' + (identity ? identity + '@' : '') + context.remoteAddress+'] ' + context.method.toUpperCase() + ' ' + status + ' ' + context.url);

	debug.assert(status).is('number');
	res.writeHead(status);
	res.end( jsonReply(body) );
}

/** Build a HTTP(s) request handler. This handler handles the core functionality; exception handling, etc.
 * @param next {Function} The application request handler, which might throw exceptions and returns promises.
 * @returns {Function} A Function which takes (req, res) arguments, handles exceptions, and forwards anything else to `next`.
 */
export default function coreRequestHandler (next) {
	return (req, res) => {
		return Q.fcall(() => {
			return Q.when(next(req, res)).then(body => {
				//console.log('body = ', body);
				const context = createContext(req);
				const type = body && body.$type || '';
				const isError = type === 'error';
				const statusCode = _.get(body, '$statusCode') || 200;
				return reply(context, res, body, statusCode);
			});
		}).fail(err => {
			const context = createContext(req);
			if (err instanceof HTTPError) {
				return reply(context, res, prepareErrorResponse(context, err.code, err.message, err), err.code);
			}

			debug.error('Error: ', err);
			const code = 500;
			const error = "Internal Service Error";
			return reply(context, res, prepareErrorResponse(context, code, error, err), code);
		}).fail(err => {
			debug.error('Unexpected error while handling error:', err);
		});
	};
}
