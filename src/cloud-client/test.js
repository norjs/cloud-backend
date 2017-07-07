
import debug from 'nor-debug';
import buildCloudClass from './index.js';

buildCloudClass('http://localhost:3000').then(Class => {

	debug.log('Class = ', Class);

	let instance = new Class();

	debug.log('instance = ', instance);

	return instance.getDate().then(date => {
		debug.log('.getDate() returned ', date, " of type ", typeof date, " and of class ", date.constructor.name);

		return instance.echo('foobar').then(str => {
			debug.log('.echo("foobar") returned "'+ str+ '" of type ', typeof str, " and of class ", str.constructor.name);
		});
	});

}).fail(err => debug.error(err)).done();