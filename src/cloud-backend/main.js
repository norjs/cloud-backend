#!/usr/bin/env node

/** Sendanor's cloud micro service backend runner
 */

import minimist from 'minimist';
import serviceRequestHandler from './serviceRequestHandler';
import httpsServer from './httpsServer.js';
import _ from 'lodash';
import debug from 'nor-debug';
import Q from 'q';
import startHTTPSServiceByName from './startHTTPSServiceByName.js';
import fs from 'fs';

const argv = minimist(process.argv.slice(2));

const usage = [
	'USAGE: ', process.argv[0], ' [OPT(s)] Service [...Service_N]',
	'  where OPTS is:',
	'    --port=PORT',
	'    --ca-file=path/to/ca.crt',
	'    --cert-file=path/to/server.crt',
	'    --key-file=path/to/server.key',
	'  and Service is a path to JavaScript class file.'
].join('\n');

if (argv._.length === 0) {
	console.log(usage);
} else {

	let config = {};
	_.forEach(Object.keys(argv), key => {
		if (key === '_') return;

		const camelCaseKey = _.camelCase(key);

		if (camelCaseKey.substr(-4, 4) === 'File') {
			config[camelCaseKey.substr(0, camelCaseKey.length - 4)] = fs.readFileSync(argv[key], {encoding:'utf8'});
		}

		config[camelCaseKey] = argv[key];
	});

	if ( (!config.ca) || (!config.cert) || (!config.key) ) {
		console.log(usage);
	} else {
		Q.all(_.map(argv._, serviceName => startHTTPSServiceByName(serviceName, config))).then(() => {
			console.log('All services started.');
		}).fail(err => {
			debug.error('Failed to start services: ', err);
		}).done();
	}

}
