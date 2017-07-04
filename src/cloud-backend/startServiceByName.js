
import debug from 'nor-debug';
import getServiceByName from './getServiceByName.js';

/** Start a service over a protocol by a name
 * @param moduleName {String} The service module name based on CWD
 */
const startServiceByName = (moduleName, config) => {
	debug.assert(moduleName).is('string');

	const Service = getServiceByName(moduleName);
	debug.assert(Service).is('function');

	return config.serviceCache.register(Service);
};

export default startServiceByName;
