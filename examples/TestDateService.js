export default class TestDateService {

	constructor (DateService) {
		this._Date = DateService;
	}

	/** Returns current date */
	updateDate () {
		return this._Date.updateDate();
	}

}