
/** Another service using another service */
export default class BarService {

	constructor (TestService) {
		this._TestService = TestService;
	}

	getDate () {
		return this._TestService.getDate();
	}

}