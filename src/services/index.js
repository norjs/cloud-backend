
import ServiceCache from './ServiceCache.js';
import LogService from './LogService.js';
import MainService from './MainService.js';
import PromptService from './PromptService.js';
import SMTPService from './SMTPService.js';
import EmailAuthenticationService from './auth/EmailAuthenticationService.js';

import {
	ServerService,
	RequestService,
	BasicAuthRequestHandler,
	BearerAuthRequestHandler
} from './server/index.js';

const defaultServices = [
	LogService
];

export {
	ServiceCache,
	LogService,
	RequestService,
	MainService,
	ServerService,
	PromptService,
	defaultServices,
	BasicAuthRequestHandler,
	BearerAuthRequestHandler,
	SMTPService,
	EmailAuthenticationService
};
