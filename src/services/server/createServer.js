/**
 * @module @sendanor/cloud-backend
 */

import Async from '../../Async.js';
import https from 'https';
import http from 'http';
import debug from '@norjs/debug';

const createServerByProtocol = {

	/* Create a HTTP server */
	http: (config, requestHandler) => http.createServer(requestHandler),

	/* Create a HTTPS server (with the client certificate support on by default) */
	https: (config, requestHandler) => {
		debug.assert(config).is('object');
		debug.assert(config.ca).is('string');
		debug.assert(config.cert).is('string');
		debug.assert(config.key).is('string');
		debug.assert(requestHandler).is('function');
		const options = {
			key: config.key,
			cert: config.cert,
			ca: config.ca,
			requestCert: _.has(config, 'requestCert') ? !!config.requestCert : true,
			rejectUnauthorized: _.has(config, 'rejectUnauthorized') ? !!config.rejectUnauthorized : true
		};
		//debug.log('https: options = ', options);
		return https.createServer(options, requestHandler);
	}
};

const _errorLogger = (err, prefix='Error:') => debug.error(prefix, err);

/**  */
const createServer = (config, requestHandler) => {

	debug.assert(config).is('object');
	debug.assert(config.port).ignore(undefined).is('integer');
	debug.assert(requestHandler).is('function');
	debug.assert(config.protocol).ignore(undefined).is('string');

	const protocol = config.protocol || 'https';

	//debug.log('config = ', config);
	//debug.log('config.port = ', config.port);
	const port = config.port ? parseInt(config.port, 10) : 3000;
	//debug.log('port = ', port);

	const server = createServerByProtocol[protocol](config, requestHandler).listen(port);

	return Async.Promise( (resolve, reject) => {
		let listeningHandler;

		const errorHandler = err => {
			debug.error('Server Error: ', err);
			server.removeListener('listening', listeningHandler);
			server.close(() => reject(err));
		};

		listeningHandler = () => {
			server.removeListener('error', errorHandler);
			resolve(server);
		};

		server.once('error', errorHandler);
		server.once('listening', listeningHandler);

		server.on('error', err => _errorLogger(err, 'Server Error:') );

	});

};

export default createServer;