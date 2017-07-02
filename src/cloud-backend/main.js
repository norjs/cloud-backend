#!/usr/bin/env node

/** Sendanor's cloud micro service backend runner
 */

import minimist from 'minimist';
import _ from 'lodash';
import debug from 'nor-debug';
import Q from 'q';
import startServiceByName from './startServiceByName.js';
import fs from 'fs';

const argv = minimist(process.argv.slice(2));

const usage = [
	'USAGE: ', process.argv[0], ' [OPT(s)] Service [...Service_N]',
	'  where OPTS is:',
	'    --protocol=PROTOCOL             -- Server protocol; HTTPS (default) or HTTP',
	'    --port=PORT                     -- Server port, by default 3000',
	'    --ca-file=path/to/ca.crt        -- Server PKI CA certificate file',
	'    --cert-file=path/to/server.crt  -- Server PKI certificate file',
	'    --key-file=path/to/server.key   -- Server PKI private key file',
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

	const serviceNames = argv._;

	if ( (!config.ca) || (!config.cert) || (!config.key) ) {
		console.log(usage);
	} else {
		Q.all(_.map(serviceNames, serviceName => startServiceByName(serviceName, config))).then(() => {
			console.log('All services started.');
		}).fail(err => {
			debug.error('Failed to start services: ', err);
		}).done();
	}

}
