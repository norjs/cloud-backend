import MicroService from './MicroService';

export default class TestService extends MicroService {

	/** The constructor is called when the backend starts */
	constructor () {
		super();
 		this.content = 'Hello World';
	}

	/** Private method */
	_secretOperation () {

	}

	/** Returns current date */
	getDate () {
 		return new Date();
	}

	/** Returns an object */
	getObject () {
 		return {"foo": "bar"};
	}

	/** Returns a string */
	getString () {
 		return "hello world";
	}

	/** Returns an array */
	getArray () {
		return ["foo", "bar", "hello", "world"];
	}

}
