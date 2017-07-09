
import debug from 'nor-debug';

/** Another service using another service */
export default class BarService {

	constructor (TestService) {
		this._TestService = TestService;
		debug.log('this._TestService = ', this._TestService);
	}

	getDate () {
		debug.log('this._TestService = ', this._TestService);
		return this._TestService.getDate();
	}

}