
import debug from 'nor-debug';
import getServiceByName from './getServiceByName.js';
import startService from './startService.js';

/** Start a service over a protocol by a name
 * @param name {String} The service module name based on CWD
 */
const startServiceByName = (name, config) => {
	debug.assert(name).is('string');

	const Service = getServiceByName(name);
	debug.assert(Service).is('function');

	const serviceInstance = new Service();
	debug.assert(serviceInstance).is('object');

	return startService(serviceInstance, config);
};

export default startServiceByName;
