/**
 * @module @sendanor/cloud-backend
 */

import _ from 'lodash';
import debug from 'nor-debug';
import is from 'nor-is';

const reservedPropertyNames = [
	'constructor',
	'hasOwnProperty',
	'toString',
	'toLocaleString',
	'valueOf',
	'isPrototypeOf',
	'propertyIsEnumerable',
	'prototype'
];

/** Returns true if reserved property name
 *
 * @param name {string}
 * @returns {boolean}
 */
function isReservedPropertyName (name) {
	return _.indexOf(reservedPropertyNames, name) >= 0;
}

/** Returns true if the keyword is a private
 *
 * @param name {string}
 * @returns {boolean}
 */
function isPrivate (name) {
	if (!name) return;
	name = _.trim(name);
	const firstLetter = name[0];
	if (firstLetter === '$') return true;
	if (firstLetter === '_') return true;
	return !!isReservedPropertyName(name);
}

/**
 *
 * @param name
 * @returns {boolean}
 */
function notPrivate (name) { return !isPrivate(name); }

/**
 *
 * @param name
 * @returns {boolean}
 */
function isFunction (name) { return is.function(name); }

/**
 *
 * @param name
 * @returns {boolean}
 */
function notFunction (name) { return !isFunction(name); }

/** Returns an array of all keys (own or not) of an object
 *
 * @param obj
 * @returns {Array}
 */
function getAllKeys (obj) {
	let r = [];
	//for (let key in obj) r.push(key);
	do {
		r = r.concat(Object.getOwnPropertyNames(obj));
	} while (obj = Object.getPrototypeOf(obj));
	return _.uniq(r);
}

/** Returns an array of all constuctors of an object, without the "Object", or a string if there is only one.
 *
 * @param obj
 * @returns {Array}
 */
function getConstructors (obj) {
	let r = [];
	while (obj = Object.getPrototypeOf(obj)) {
		r.push(_.get(obj, 'constructor.name'));
	}

	//debug.log('constructors = ', r);

	if ( (_.last(r) === 'Object') && (r.length >= 2) )  {
		r.length -= 1;
	}

	if (r.length === 1) {
		r = _.first(r);
	}

	return r;
}

const STRIP_COMMENTS = /(\/\/.*$)|(\/\*[\s\S]*?\*\/)/mg;
const STRIP_PARAMS = /(\s*=[^,]*(('(?:\\'|[^'\r\n])*')|("(?:\\"|[^"\r\n])*"))|(\s*=[^,]*))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;

/** Parse function argument names
 *
 * @param f
 * @returns {Array}
 */
function parseFunctionArgumentNames (f) {
	debug.assert(f).is('function');

	let str = f.toString().replace(STRIP_COMMENTS, '');

	if (str.substr(0, 'class '.length) === 'class ') {
		str = str.substr(str.indexOf('{')+1);
		debug.log('str = ', str);
	}

	str = str.substr(str.indexOf('(')+1);
	str = str.substr(0, str.lastIndexOf(')', str.indexOf('{')));
	str = str.replace(STRIP_PARAMS, '');

	const result = str.match(ARGUMENT_NAMES);

	if (!is.array(result)) return [];
	return result;
}

// Exports
export {
	isReservedPropertyName,
	isPrivate,
	notPrivate,
	isFunction,
	notFunction,
	getAllKeys,
	getConstructors,
	parseFunctionArgumentNames
}
