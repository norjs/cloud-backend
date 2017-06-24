
/** Base class for MicroServices */
export default class MicroService {

	/** The constructor is called when the backend starts */
	constructor () {
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

}