
import Q from 'q';
import fs from 'fs';
import https from 'https';
import http from 'http';
import debug from 'nor-debug';

const createServerByProtocol = {
	http: config => http.createServer(config.requestHandler),
	https: config => {
		debug.assert(config).is('object');
		debug.assert(config.ca).is('string');
		debug.assert(config.cert).is('string');
		debug.assert(config.key).is('string');
		debug.assert(config.requestHandler).is('function');
		const options = {
			key: config.key,
			cert: config.cert,
			ca: config.ca,
			requestCert: true,
			rejectUnauthorized: true
		};
		debug.log('https: options = ', options);
		return https.createServer(options, config.requestHandler );
	}
};

/** Create a HTTPS server with client certificate support */
const createServer = config => {

	debug.assert(config).is('object');
	debug.assert(config.port).ignore(undefined).is('integer');
	debug.assert(config.requestHandler).is('function');
	debug.assert(config.protocol).ignore(undefined).is('string');

	const protocol = config.protocol || 'https';

	debug.log('config = ', config);
	debug.log('config.port = ', config.port);
	const port = config.port ? parseInt(config.port, 10) : 3000;
	debug.log('port = ', port);

	const server = createServerByProtocol[protocol](config).listen(port);

	const defer = Q.defer();

	let listeningHandler;

	const errorHandler = err => {
		server.removeListener('listening', listeningHandler);
		server.close(() => defer.reject(err));
	};

	listeningHandler = () => {
		server.removeListener('error', errorHandler);
		defer.resolve(server);
	};

	server.once('error', errorHandler);
	server.once('listening', listeningHandler);

	return defer.promise;
};

export default createServer;