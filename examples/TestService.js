import MicroService from './MicroService';

import moment from 'moment';

export default class TestService extends MicroService {
	$onDestroy () {
		return super.$onDestroy();
	}

	/** The constructor is called when the backend starts */
	constructor () {
		super();
 		this.content = 'Hello World';
	}

	/** Private method */
	_secretOperation () {
		return {'secret': 'message'};
	}

	/** Returns current date */
	getDate () {
 		return new Date();
	}

	/** Returns an object */
	getObject () {
 		return {"foo": "bar", date: new Date()};
	}

	/** Returns a string */
	getString () {
 		return "hello world";
	}

	/** Returns a number */
	getNumber () {
 		return 123.456;
	}

	/** Returns an array */
	_getArray () {
		return ["foo", "bar", "hello", "world"];
	}

	/** Returns an array */
	array () {
		return this._getArray();
	}

	get array () {
		return this._getArray();
	}

	/** */
	echo (value) {
		return "Hello there! You sent: " + value;
	}

	get time () {
		if (Math.random() > 0.9) return Date.now();
		return 'Test';
	}

}
