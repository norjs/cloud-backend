export default class TestDateService {

	constructor (DateService) {
		this._Date = DateService;
	}

	updateDate () {
		return this._Date.updateDate();
	}

}