import _ from 'lodash';
import is from 'nor-is';
import debug from 'nor-debug';
import Q from 'q';
import reserved from 'reserved-words';
import globals from 'globals';
import { postRequest } from './request.js';

/** Global cache for classes */
const _cache = {};

/** */
function parse_type (type) {
	if (is.array(type)) return type;
	if (is.string(type)) return [type];
	return [];
}

/** Check if reserved word in ES6 */
function isReservedWord (name) {
	if (reserved.check(name, 6)) {
		return true;
	}
	return globals.es6[name] !== undefined;
}

/** */
function isValidName (name) {
	return is.string(name) && is.pattern(name, /^[a-zA-Z$_][a-zA-Z0-9$_]*$/);
}

function assertValidName (name) {
	if (!isValidName(name)) {
		throw new TypeError("Name is not a valid name: "+name);
	}
	if (isReservedWord(name)) {
		throw new TypeError("Name is a reserved word: "+name);
	}
}

/** */
function isValidClassName (name) {
	return is.string(name) && is.pattern(name, /^[a-zA-Z][a-zA-Z0-9$_]*$/);
}

function assertValidClassName (className) {
	if (!isValidClassName(className)) {
		throw new TypeError("Class name is not a valid name: "+className);
	}
	if (isReservedWord(className)) {
		throw new TypeError("Class name is a reserved word: "+className);
	}
}

/** Parse payload from backend */
const parsePayload = result => {
	debug.assert(result).is('object');
	const payloadType = result.$type;
	const payloadPath = result.$path;
	const payload = payloadPath ? _.get(result, payloadPath) : result;
	if (payloadType === "Date") {
		return new Date(payload);
	}
	return payload;
}

/** */
export function buildCloudClassSync (body) {
	debug.log('body = ', body);

	debug.assert(body).is('object');

	let methods = [];
	let properties = [];

	Object.keys(body).forEach(key => {
		assertValidName(key);
		const value = body[key];
		const isMethod = is.object(value) && value.$type === 'Function';
		(isMethod ? methods : properties).push(key);
	});

	const setupStaticData = (self, data) => {

		// Copy properties from prototype
		_.forEach(properties, key => {
			const firstLetter = key && key.length >= 1 ? key[0] : '';
			if (firstLetter === '$') return;
			if (firstLetter === '_') return;
			self[key] = _.cloneDeep(body[key])
		});

		// Copy properties from provided instance (arguments to constructor)
		if (is.object(data)) {
			_.forEach(Object.keys(data), key => {
				const firstLetter = key && key.length >= 1 ? key[0] : '';
				//if (firstLetter === '$') return;
				if (firstLetter === '_') return;
				if (key === '$prototype') return;
				self[key] = _.cloneDeep(data[key]);
			});
		}
	};

	let Class;
	const types = parse_type(body.$type);
	if (types.length === 0) {
		Class = class {constructor(data) { setupStaticData(this, data); }};
	} else if (types.length === 1) {
		const className = _.first(types);
		assertValidClassName(className);
		Class = (new Function("setup", "return class "+className+" { constructor(data) { setup(this, data); } }"))(setupStaticData);
	} else {
		const firstClassName = _.first(types);
		Class = _.reduceRight(types, (Base, className) => {
			assertValidClassName(className);
			if (Base === undefined) {
				return (new Function("setup", "return class "+className+" {}"))();
			}
			debug.assert(Base).is('function');
			if (firstClassName === className) {
				return (new Function("Base", "setup", "return class "+className+" extends Base { constructor(data) { super(); setup(this, data); } }"))(Base, setupStaticData);
			} else {
				return (new Function("Base", "return class "+className+" extends Base { constructor() { super(); } }"))(Base);
			}
		}, undefined);
	}

	// Add prototype methods
	_.forEach(methods, key => {
		const baseUrl = body.$ref || url;
		const methodUrl = (baseUrl && (baseUrl.length >= 1) && (baseUrl[baseUrl.length-1] === '/')) ? baseUrl + key : baseUrl + '/' + key;
		Class.prototype[key] = (...$args) => postRequest(methodUrl, {$args}).then(parsePayload);
	});

	return Class;
}

export function buildCloudClass (body) {
	return Q.when(buildCloudClassSync(body));
}

/** Get a JS class for this cloud object. It is either found from cache or generated. */
function getCloudClass (body) {
	return Q.fcall( () => {
		debug.assert(body).is('object');
		debug.assert(body.$id).is('uuid');

		let type;
		if (!is.array(body.$type)) {
			type = body.$type;
		} else {
			type = _.first(body.$type);
		}

		const id = body.$id;

		debug.assert(type).is('string');

		let cache1 = _cache[type];
		if (!is.object(cache1)) {
			cache1 = _cache[type] = {};
		}

		const now = (new Date().getTime());

		let cache2 = cache1[id];
		if (is.object(cache2)) {
			cache2.time = now;
			return cache2.Type;
		}

		// Remove other IDs from cache which have not been used in 5 minutes
		Object.keys(cache1).forEach(id_ => {
			const value = cache1[id_];
			const time = value.time;
			if (now - time >= 5*60*1000) {
				delete cache1[id_];
			}
		});

		cache2 = cache1[id] = {
			name: type,
			id,
			Type: buildCloudClassSync(body),
			time: now
		};

		return cache2.Type;
	});
}

export default getCloudClass;
