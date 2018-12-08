/**
 * @module @sendanor/cloud-backend
 */

import _ from 'lodash';
import debug from 'nor-debug';
import apacheMd5 from "apache-md5";
import { HTTPError } from "nor-errors";

/** HTTP Bearer Authentication Support
 *
 * @static
 */
class BearerAuthRequestHandler {

	constructor (EmailAuthenticationService) {

		/** @member {EmailAuthenticationService} */
		this._auth = EmailAuthenticationService;

	}

	/**
	 *
	 * @param config
	 * @private
	 */
	$onConfig (config) {
		this._config = _.get(config, 'auth.bearer') || _.get(config, 'authBearer');

		debug.log('config = ', this._config);
	}

	/**
	 * Sets WWW-Authenticate and throws 401 HTTP Error
	 * @private
	 * @returns {undefined}
	 */
	_notOk (req, res) {
		res.setHeader('WWW-Authenticate', 'Bearer realm="Secure Area"');
		throw new HTTPError(401);
	}

	/**
	 *
	 * @param req
	 * @param res
	 * @param next
	 * @returns {*}
	 * @private
	 */
	$onRequest (req, res, next) {

		debug.log('req.url =', req.url);

		const config = this._config;

		debug.assert(config).is('object');
		debug.assert(next).is('function');

		if (req && _.toLower(req.method) === 'options') {
			res.setHeader('WWW-Authenticate', 'Bearer realm="Secure Area"');
			return;
		}

		const authorization = _.get(req, 'headers.authorization');
		if (!authorization) return this._notOk(req, res);
		debug.assert(authorization).is('string');

		if (authorization.substr(0, 'Bearer '.length).toLowerCase() !== 'bearer ') {
			throw new TypeError("Not supported authorization type: " + authorization.split(' ')[0]);
		}

		const auth = (Buffer.from(authorization.substr('Bearer '.length), 'base64')).toString();
		debug.assert(auth).is('string');

		console.log('Parsed: "' +auth + '"');

		// OK

		return next();
	}

}

export default BearerAuthRequestHandler