/**
 * @module
 */

// Dependencies

import Q from 'q';
import _ from 'lodash';
import is from 'nor-is';
import debug from 'nor-debug';
import moment from 'moment';
import fs from 'nor-fs';
import events from 'events';
import PATH from 'path';

// Older Node.js has EventEmitter as events.EventEmitter, not same as events
const EventEmitter = is.function(events && events.EventEmitter) ? events.EventEmitter : events;

export {
	Q,
	_,
	is,
	debug,
	moment,
	fs,
	PATH,
	EventEmitter
};

// Helpers

import {
	isPrivate,
	getAllKeys,
	notPrivate,
	getConstructors,
	notFunction,
	parseFunctionArgumentNames
} from './helpers.js';

export {
	isPrivate,
	getAllKeys,
	notPrivate,
	getConstructors,
	notFunction,
	parseFunctionArgumentNames
};

// Parse prompt

import ParseError from './ParseError.js';
export { ParseError };

import parsePrompt from './parsePrompt.js';
export { parsePrompt };

// getServiceByName
import getServiceByName from './getServiceByName.js';
export { getServiceByName };

// ENVs

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

export {
	isProduction,
	isDevelopment
};
