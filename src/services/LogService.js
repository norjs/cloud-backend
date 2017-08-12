import _ from 'lodash';
import debug from 'nor-debug';
import moment from 'moment';

/** The main service to handle backend HTTP(s) requests */
export default class LogService {

	constructor () {
	}

	log (...args) {
		console.log(moment().format() + ' ' + _.join(args, ' '))
	}

	info (...args) {
		console.log(moment().format() + ' ' + _.join(args, ' '))
	}

	warn (...args) {
		debug.warn(...args);
	}

	error (...args) {
		debug.error(...args);
	}

	debug (...args) {
		debug.log(...args);
	}

}