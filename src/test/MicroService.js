
import Service from '../cloud-backend/Service.js';

/** Base class for MicroServices */
export default class MicroService extends Service {

	/** The constructor is called when the backend starts */
	constructor () {
		this.microServiceVersion = '1.0';
	}

	/** Called when the micro service starts */
	$onInit () {
	}

	/** Called when a connection is started from a new micro service
	 * @param service {MicroService} Interface to the other microservice
	 */
	$onActivate (service) {
	}

	/** Called after a connection is lost to a micro service
	 * @param service {MicroService} Interface to the other microservice
	 */
	$onDeactivate (service) {
	}

	/** Destroy is called when this microservice is closing down */
	$onDestroy () {
	}

	/** A function inside a parent class */
	parentMethodTest (input) {
		return {
			date: new Date(),
			payload: input
		};
	}

}