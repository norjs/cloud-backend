
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
	res.end( jsonReply(body) );

	const identity = context.$getIdentity();
	const diff = process.hrtime(context.$hrtime);
	const time = (diff[0] * NS_PER_SEC + diff[1]) / 1000000;
	console.log(moment().format() + ' [' + (identity ? identity + '@' : '') + context.remoteAddress+'] ' + context.method.toUpperCase() + ' ' + status + ' ' + context.url + ' ['+time+']');
}

/** Build a HTTP(s) request handler. This handler handles the core functionality; exception handling, etc.
 * @param next {Function} The application request handler, which might throw exceptions and returns promises.
 * @returns {Function} A Function which takes (req, res) arguments, handles exceptions, and forwards anything else to `next`.
 */
export default function coreRequestHandler (next) {
	return (req, res) => {
		const $hrtime = process.hrtime();
		return Q.fcall(() => {
			return Q.when(next(req, res)).then(body => {
				//console.log('body = ', body);

				const context = createContext(req);

				context.$hrtime = $hrtime;

				const type = body && body.$type || '';
				const hash = body && body.$hash || '';
				const isError = type === 'error';
				const statusCode = _.get(body, '$statusCode') || 200;

				if (!isError) {
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
