
import debug from 'nor-debug';

/** Another service using another service */
export default class BarService {

	constructor (TestService) {
		this._TestService = TestService;
		//debug.log('constructor: this._TestService = ', this._TestService);
		//debug.log('this = ', this);
		//debug.log('this.$id = ', this.$id);
	}

	getDate () {
		//debug.log('getDate: this._TestService = ', this._TestService);
		//debug.log('this = ', this);
		//debug.log('this.$id = ', this.$id);
		return this._TestService.getDate();
	}

	get time () {
		//debug.log('this = ', this);
		//debug.log('this.$id = ', this.$id);
		//debug.log('this._TestService = ', this._TestService);
		return this._TestService.time;
	}

}