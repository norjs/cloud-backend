
import debug from 'nor-debug';
import buildCloudClass from './index.js';
import { getRequest } from './request.js';

getRequest('http://localhost:3000').then( body => {
	debug.assert(body).is('object');
	debug.assert(body.$prototype).is('object');
	return buildCloudClass(body.$prototype).then(Class => {

		debug.log('Class = ', Class);
		debug.assert(Class).is('function');

		let instance = new Class(body);
		debug.log('instance = ', instance);
		debug.assert(instance).is('object');

		return instance.getDate().then(date => {
			debug.log('.getDate() returned ', date, " of type ", typeof date, " and of class ", date.constructor.name);
			debug.assert(date).is('date');

			return instance.echo('foobar').then(str => {
				debug.assert(str).is('string');
				debug.log('.echo("foobar") returned "' + str + '" of type ', typeof str, " and of class ", str.constructor.name);
			});
		});
	});
}).fail(err => debug.error(err)).done();