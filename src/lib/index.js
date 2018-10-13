/**
 * @module @sendanor/cloud-backend
 */

// Dependencies
import Q from 'q';
import _ from 'lodash';
import debug from 'nor-debug';
import moment from 'moment';
import fs from 'nor-fs';
import events from 'events';
import PATH from 'path';

// Older Node.js has EventEmitter as events.EventEmitter, not same as events
const EventEmitter = _.isFunction(events && events.EventEmitter) ? events.EventEmitter : events;

// Helpers
import {
	isPrivate
	, getAllKeys
	, notPrivate
	, getConstructors
	, notFunction
	, parseFunctionArgumentNames
	, isUUID
} from './helpers.js';

import ParseError from './ParseError.js';
import parsePrompt from './parsePrompt.js';
import getServiceByName from './getServiceByName.js';

// ENVs
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

export {
	Q
	, _
	, debug
	, moment
	, fs
	, PATH
	, EventEmitter
	, isPrivate
	, getAllKeys
	, notPrivate
	, getConstructors
	, notFunction
	, parseFunctionArgumentNames
	, isUUID
	, ParseError
	, parsePrompt
	, getServiceByName
	, isProduction
	, isDevelopment
};
