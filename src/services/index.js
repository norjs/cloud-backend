
import ServiceCache from './ServiceCache.js';
import LogService from './LogService.js';
import RequestService from './RequestService.js';
import MainService from './MainService.js';
import ServerService from './ServerService.js';
import PromptService from './PromptService.js';

export {
	ServiceCache,
	LogService,
	RequestService,
	MainService,
	ServerService,
	PromptService
};

const builtInServices = [
	LogService,
	RequestService,
	ServerService,
	PromptService
];

export default builtInServices;
