/** */
class LazyProtocolPicker {

	constructor () {
		this._http = null;
		this._https = null;
	}

	get http () {
		if (!this._http) this._http = require('http');
		return this._http;
	}

	get https () {
		if (!this._https) this._https = require('https');
		return this._https;
	}

}

export default LazyProtocolPicker;