import Q from 'q';
import _ from 'lodash';
import is from 'nor-is';
import debug from 'nor-debug';

import { createContext } from '../responses.js';

/**  */
export default class CoreRequestHandler {


	/** Handles successful requests */
	$onRequest (req, res, next) {

		debug.assert(req).is('object');
		debug.assert(res).is('object');

		// Set time
		const hrtime = process.hrtime();
		const context = createContext(req);
		context.$setTime(hrtime);

		// Enable CORS
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
		res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,prefer,if-none-match');
		res.setHeader('Access-Control-Allow-Credentials', true);

		return next();
	}

}
