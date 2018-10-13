/** SMTPService - The email sender service using remote SMTP server
 * @module @sendanor/cloud-backend
 */

//import Q from 'q';
import _ from 'lodash';
//import PATH from 'path';
import debug from 'nor-debug';
//import exec from 'nor-exec';
import is from 'nor-is';
import mailer from 'nor-mailer';

/**
 * @typedef {object} SMTPServiceOptionsObject
 * @property {string} from -- Default sender email address
 * @property {string} host -- The SMTP server hostname, defaults to `"localhost"`.
 * @property {string} port -- THe SMTP server port, defaults to `25`.
 * @property {boolean} secureConnection -- Enable SSL connection, defaults to `false`.
 * @property {object} auth -- Authentication options
 * @property {object} auth.user -- The username for authentication
 * @property {object} auth.pass -- The password for authentication
 */

/**
 * @typedef {object} SendOptionsObject
 * @property {string} from -- Sender email address
 * @property {string} to -- Target email address
 * @property {string} subject -- The subject line for email
 * @property {string} body -- The content of email as plain text
 */

/**
 * @typedef {object} SentEmailObject
 * @property {string} message -- Reply from the SMTP server, like `"250 OK id=1dkbPk-0001BD-DD"`.
 * @property {string} messageId -- The SMTP server message ID
 */

/**
 *
 * @static
 */
class SMTPService {

	constructor () {

		/** {SMTPServiceOptionsObject} */
		this._config = {
			"host": null,
			"port": 465,
			"secureConnection": true
		};

	}

	/**
	 * Set configurations for this service.
	 * @param config {SMTPOptionsObject}
	 * @private
	 */
	setConfig (config) {
		debug.assert(config).is('object');
		this._config = Object.assign({
			"host": "localhost",
			"port": 25,
			"secureConnection": false
			//"auth": {
			//	"user": "app",
			//	"pass": "12345678"
			//}
		}, config);

		// FIXME: These are workarounds for command line interface. Remove once cloud-backend implements it automatically.

		if (_.has(config, 'smtp-host')) {
			this._config.host = config['smtp-host'];
		}

		if (_.has(config, 'smtp-port')) {
			this._config.port = config['smtp-port'];
		}

		if (_.has(config, 'smtp-auth-user')) {
			if(!this._config.auth) {
				this._config.auth = {};
			}
			this._config.auth.user = config['smtp-auth-user'];
		}

		if (_.has(config, 'smtp-auth-pass')) {
			if(!this._config.auth) {
				this._config.auth = {};
			}
			this._config.auth.pass = config['smtp-auth-pass'];
		}

		if(is.string(this._config.port)) {
			this._config.port = parseInt(this._config.port, 10);
		}
	}

	/**
	 *
	 * @param config
	 * @private
	 */
	$onConfig (config) {
		this.setConfig(config && config.smtp || {});
	}

	/**
	 *
	 * @private
	 */
	$onInit () {
		debug.assert(this._config).is('object');

		if (!this._config.host) throw new TypeError("The SMTP server hostname (host property) not defined");

		debug.assert(this._config.host).is('string');
		debug.assert(this._config.port).is('number');
		debug.assert(this._config.secureConnection).is('boolean');
		debug.assert(this._config.auth).ignore(undefined).is('object');

		this._mailer = mailer({"smtp": this._config});
	}

	/**
	 *
	 * @private
	 */
	$onDestroy () {
		return this._mailer.close();
	}

	/** Send an email
	 * @param opts {SendOptionsObject} Options for email
	 * @returns {SentEmailObject}
	 */
	send (opts) {
		debug.assert(opts).is('object');
		debug.assert(opts.from).ignore(undefined).is('string');
		debug.assert(opts.to).is('string');
		debug.assert(opts.subject).is('string');
		debug.assert(opts.body).is('string');

		debug.assert(this._config.from).ignore(undefined).is('string');

		const from = opts.from || this._config.from;

		if (!from) throw new TypeError('From address must be configured or provided!');

		const to = opts.to;
		const subject = opts.subject;
		const body = opts.body;

		return this._mailer.send({from, to, subject, body});
	}

}

export default SMTPService;