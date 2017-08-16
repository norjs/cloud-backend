import _ from 'lodash';
import debug from 'nor-debug';
import apacheMd5 from "apache-md5";
import { HTTPError } from "nor-errors";

/** Sets WWW-Authenticate and throws 401 HTTP Error */
function _notOk (req, res) {
	res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
	throw new HTTPError(401);
}

/** */
function _basicAuthRequestHandler (req, res, next, config) {
	debug.assert(config).is('object');
	debug.assert(config.credentials).is('array');
	debug.assert(next).is('function');

	if (req && _.toLower(req.method) === 'options') {
		res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
		return;
	}

	const authorization = _.get(req, 'headers.authorization');
	if (!authorization) return _notOk(req, res);
	debug.assert(authorization).is('string');

	if (authorization.substr(0, 'Basic '.length).toLowerCase() !== 'basic ') {
		throw new TypeError("Not supported authorization type: " + authorization.split(' ')[0]);
	}

	const auth = (new Buffer(authorization.substr('Basic '.length), 'base64')).toString();
	debug.assert(auth).is('string');

	//console.log('Parsed: "' +auth + '"');

	const authSplitted = auth.split(':');
	const username = authSplitted.shift();
	const password = authSplitted.join(':');
	debug.assert(username).is('string');
	debug.assert(password).is('string');

	//debug.log('unverifiedUser = ', username);
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
	return next();
}

/** HTTP Basic Authentication Support */
export default function basicAuthRequestHandler (config) {
	return (req, res, next) => _basicAuthRequestHandler(req, res, next, config);
}
