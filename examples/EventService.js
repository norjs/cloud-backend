import is from 'nor-is';
import events from 'events';
const EventEmitter = is.function(events && events.EventEmitter) ? events.EventEmitter : events;

export default class EventService {

	constructor () {
		this._events = new EventEmitter();
	}

	$onInit () {

		this._events.on('save', data => this._onSave(data));

		this._interval = setInterval( () => this.emit('time', new Date()), 1000 );

	}

	$onDestroy () {
		clearInterval(this._interval);
	}

	_onSave (data) {
		this._backup = data;
	}

	getBackup () {
		return this._backup;
	}

	emit (...args) {
		return this._events.emit(...args);
	}

}