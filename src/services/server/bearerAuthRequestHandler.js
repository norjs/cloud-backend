import _ from 'lodash';
import debug from 'nor-debug';
import apacheMd5 from "apache-md5";
import { HTTPError } from "nor-errors";

/** Sets WWW-Authenticate and throws 401 HTTP Error */
function _notOk (req, res) {
	res.setHeader('WWW-Authenticate', 'Bearer realm="Secure Area"');
	throw new HTTPError(401);
}

/** */
function _bearerAuthRequestHandler (req, res, next, config) {
	debug.assert(config).is('object');
	debug.assert(config.credentials).is('array');
	debug.assert(next).is('function');

	const authorization = _.trim(_.get(req, 'headers.authorization'));
	if (!authorization) return _notOk(req, res);
	debug.assert(authorization).is('string');

	if (authorization.substr(0, 'Bearer '.length).toLowerCase() !== 'bearer ') {
		throw new TypeError("Not supported authorization type: " + authorization.split(' ')[0]);
	}

	const accessToken = _.trim(authorization.substr('Bearer '.length));
	debug.assert(accessToken).is('string');
	debug.log('accessToken = ', accessToken);

	req.unverifiedUser = username;
	//debug.log('unverifiedUser = ', req.unverifiedUser);

	//console.log('Username: "' + username +'"');
	//console.log('Password: "' + password + '"');

	const cred = _.find(config.credentials, cred => username === cred.username);
	if (!cred) {
		//console.log('User not found.');
		return _notOk(req, res);
	}

	debug.assert(cred).is('object');
	debug.assert(cred.username).is('string').equals(username);

	const cryptedPassword = cred.password;
	debug.assert(cryptedPassword).is('string');

	if (apacheMd5(password, cryptedPassword) !== cryptedPassword) {
		//console.log('Password did not match: "' + cryptedPassword + '"');
		return _notOk(req, res);
	}

	// OK

	req.user = username;
	return next(req, res);
}

/** HTTP Bearer Authentication Support */
export default function bearerAuthRequestHandler (next, config) {
	return (req, res) => _bearerAuthRequestHandler(req, res, next, config);
}
