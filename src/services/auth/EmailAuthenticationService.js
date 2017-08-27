/** EmailAuthenticationService */

import Q from 'q';
import _ from 'lodash';
import is from 'nor-is';
import debug from 'nor-debug';
import crypto from 'crypto';

/** @typedef {object} ApiKeyObject
 * @property {string} apiKey - The apiKey which can be used to verify access to an email address
 * @property {string} email - The email address
 */

/** cloud-backend service for authenticating users with email address and/or verifying an email address is a working one */
export default class EmailAuthenticationService {

	constructor (LogService, SMTPService) {

		/** @member {LogService} */
		this._log = LogService;

		/** @member {SMTPService} */
		this._smtp = SMTPService;

		/** @member {object} */
		this._codes = {};

		/** @member {object} */
		this._apiKeys = {};

	}

	$onConfig (config) {

		/** The timeout in minutes for unverified codes. If a code is not verified in this time, it will be removed.
		 * Defaults to 5 minutes.
		 */
		this._unverifiedTimeout = parseInt(_.get(config, 'auth.email.timeout') || _.get(config, 'authEmailTimeout'), 10) || 5;

		/** The timeout in minutes for verified codes. After this time, the code will be marked as expired. Defaults
		 * to 60 minutes.
		 */
		this._verifiedTimeout = parseInt(_.get(config, 'auth.email.verifiedTimeout') || _.get(config, 'authEmailVerifiedTimeout'), 10) || 60;

		/** The timeout in minutes for expired codes. These are verified codes, which have expired. After this time,
		 * those codes will be removed. Defaults to 8 hours.
		 */
		this._expiredTimeout = parseInt(_.get(config, 'auth.email.expiredTimeout') || _.get(config, 'authEmailExpiredTimeout'), 10) || 480;

		/** The from address used in verification emails */
		this._from = _.get(config, 'auth.email.from') || _.get(config, 'authEmailFrom');

		if (this._from) {
			this._assertEmail(this._from);
		} else {
			this._from = undefined;
		}

		/** The subject used in verification emails */
		this._subject = _.get(config, 'auth.email.subject') || _.get(config, 'authEmailSubject') || 'Email Authentication';

		/** The template for body used in verification emails */
		this._signature = _.get(config, 'auth.email.signature') || _.get(config, 'authEmailSignature') || [
			'-- ',
			'Email Authentication Service'
		].join('\n');

		/** The template for body used in verification email */
		this._body = _.get(config, 'auth.email.body') || _.get(config, 'authEmailBody') || [
			'Hi,',
			'',
			'Your authentication code is: <%= secret %>',
			'',
			'<%= signature %>'
		].join('\n');

	}

	$onInit () {

		/** The subject used in verification emails
		 * @member {function}
		 */
		this._getSubject = _.template( this._subject );

		/** The template for body used in verification emails
		 * @member {function}
		 */
		this._getSignature = _.template( this._signature );

		/** The template for body used in verification emails
		 * @member {function}
		 */
		this._getBody = _.template( this._body );

		/* Start interval */
		//this._startInterval();

	}

	/** Starts a interval (unless it's already running or there is no data to process) */
	_startInterval () {

		if (this._interval) return;

		this._log.info('Started interval background processor.');

		this._interval = setInterval(
			() => Q.fcall(
				() => this._refresh()
			).fail( err => {
				this._log.error('Error in interval handler: ', err);
			}).done(),
			1000*60
		);

	}

	/** Stops a interval (unless it's already stopped) */
	_stopInterval () {
		if (this._interval) {
			this._log.info('Stopped interval background processor.');
			clearInterval( this._interval );
			this._interval = undefined;
		}
	}

	/** Check interval status; start or stop it depending if there is data to process */
	_refreshInterval () {

		const isRunning = !!(this._interval);
		const notRunning = !isRunning;

		const hasData = !!(_.keys(this._codes).length);
		const hasNoData = !hasData;

		if (isRunning && hasNoData) {
			return this._stopInterval();
		}

		if (notRunning && hasData) {
			return this._startInterval();
		}

	}

	$onDestroy () {
		this._stopInterval();
	}

	/** Check if an address looks like a valid email address.
	 *
	 * We don't actually support all valid email addresses. Only most common formats are accepted.
	 *
	 * Most notably we don't support:
	 *
	 *   - Quoted strings
	 *   - Special characters
	 *   - Comments
	 *
	 * @returns {boolean}
	 */
	_isValidAddress (email) {

		// Only strings are accepted
		if (!is.string(email)) return false;

		// Only longer than five characters and less than 254 characters are accepted (a@b.c)
		if (email.length < 5) return false;
		if (email.length > 254) return false;

		// The address must have a '@' character, and it must not be first.
		const atIndex = email.indexOf('@');
		if (atIndex < 1) return false;

		// The local part must be no longer than 64 characters
		if (atIndex > 64) return false;

		// The domain part must be no longer than 255 characters
		if (email.length - 1 - atIndex > 255) return false;

		// The domain name part must have at least one dot
		if (email.indexOf('.', atIndex) < atIndex+2) return false;

		// There must not be another '@' character
		const atIndex2 = email.indexOf('@', atIndex+1);
		if (atIndex2 >= atIndex+1) return false;

		const localPart = email.substr(0, atIndex);
		const domainPart = email.substr(atIndex+1);

		// Validate local format
		if (!localPart.match(/^([a-zA-Z0-9\+\-_]+)(\.[a-zA-Z0-9\+\-_]+)*$/)) return false;

		// Validate domain format
		if (!domainPart.match(/^(([a-zA-Z0-9]+)(\-([a-zA-Z0-9]+))*)(\.(([a-zA-Z0-9]+)(\-([a-zA-Z0-9]+))*))*$/)) return false;

		return true;
	}

	/** Check if an address looks like a valid email address.
	 *
	 * We don't actually support all valid email addresses. Only most common formats are accepted.
	 *
	 * Most notably we don't support:
	 *
	 *   - Quoted strings
	 *   - Special characters
	 *   - Comments
	 *
	 * @returns {Promise.<boolean>}
	 */
	isValidAddress (email) {
		return Q.fcall( () => this._isValidAddress(email) );
	}

	/** Start a verification process to check if an email address is valid and working.
	 * We'll send an email with a secret code, which the user must provide in order to get an API key.
	 * @param email {string}
	 * @returns {Promise}
	 */
	initiate (email) {
		return Q.fcall( () => {

			// First verify it's in valid format
			this._assertEmail(email);

			let templateOpts = {};
			let sendOpts = {};

			if (this._from) templateOpts.from = sendOpts.from = this._from;

			sendOpts.to = templateOpts.to = email;

			const secret = templateOpts.secret = this._createSecretCode();

			const code = this._registerCode(secret, email);
			debug.assert(code).is('object');
			debug.assert(code.apiKey).is('string');
			debug.assert(code.email).is('string').equals(email);
			debug.assert(code.code).is('string').equals(secret);
			debug.assert(code.verified).is('boolean');
			debug.assert(code.expired).is('boolean');

			sendOpts.subject = templateOpts.subject = this._getSubject(templateOpts);

			templateOpts.signature = this._getSignature(templateOpts);

			sendOpts.body = this._getBody(templateOpts);

			return this._smtp.send(sendOpts).then( () => {

				//const apiKey = code.apiKey;
				const verified = code.verified;
				const expired = code.expired;

				this._log.info('User initiated auth process for ' + code.email);

				this._refreshInterval();

				return {
					//apiKey, // We don't want to expose apiKey until the email is verified
					verified,
					expired,
					email
				};

			} );
		} ).catch( err => {
			this._log.error('Verification failed: ', err);
			return Q.reject(new Error("Initiation failed"))
		});
	}

	/** End a verification process by proofing you know the secret code from the email address we sent.
	 *
	 * In .initiateVerify() we sent a message to the email address with a secret code, and here the user can proof he
	 * really received the email.
	 *
	 * We'll disable the secret code and provide a new apiKey to use.
	 *
	 * @param email {string}
	 * @param secret {string} The code from the verification email
	 * @returns {Promise.<ApiKeyObject>}
	 */
	verify (email, secret) {
		return Q.fcall( () => {

			this._assertEmail(email);
			debug.assert(secret).is('string');

			if (!_.has(this._codes, email)) {
				throw new Error("No codes for this email detected");
			}

			const code = this._codes[email];
			debug.assert(code).is('object');
			debug.assert(code.email).is('string').equals(email);
			debug.assert(code.code).is('string').equals(secret);
			debug.assert(code.verified).is('boolean');
			debug.assert(code.expired).is('boolean');

			const now = new Date();

			code.code = undefined;
			const apiKey = code.apiKey;
			const verified = code.verified = true;
			const expired = code.expired;
			code.verifiedTime = now;

			this._log.debug('User verified code for ' + code.email);

			return {
				apiKey,
				verified,
				expired,
				email
			};

		} ).catch( err => {
			this._log.error('Verification failed: ', err);
			return Q.reject(new Error('Verification failed'));
		});
	}

	/** Check the status of an apiKey.
	 *
	 * @param apiKey {string}
	 * @returns {Promise.<Object>}
	 */
	check (apiKey) {
		return Q.fcall( () => {

			debug.assert(apiKey).is('string');

			if (!_.has(this._apiKeys, apiKey)) {
				throw new Error("This apiKey was unknown");
			}

			const code = this._apiKeys[apiKey];
			debug.assert(code).is('object');
			debug.assert(code.apiKey).is('string').equals(apiKey);
			debug.assert(code.email).is('string');
			debug.assert(code.verified).is('boolean');
			debug.assert(code.expired).is('boolean');

			const now = new Date();
			code.lastCheckTime = now;

			const email = code.email;
			const verified = code.verified;
			const expired = code.expired;

			this._log.debug('User checked code for ' + code.email);

			return {
				apiKey,
				verified,
				expired,
				email
			};

		} ).catch( err => {
			this._log.error('Check failed: ', err);
			return Q.reject(new Error('Check failed'));
		});
	}

	/** Clear an apiKey. This can be used in a logout process.
	 *
	 * @param apiKey {object|string}
	 * @returns {object}
	 */
	_clear (apiKey) {

		if (is.object(apiKey) && apiKey.apiKey) {
			apiKey = apiKey.apiKey;
		}

		debug.assert(apiKey).is('string');

		if (!_.has(this._apiKeys, apiKey)) {
			throw new Error("This apiKey was unknown: " + apiKey);
		}

		const code = this._apiKeys[apiKey];
		debug.assert(code).is('object');

		this._unregisterCode(code);

		return code;
	}

	/** Clear an apiKey. This can be used in a logout process.
	 *
	 * @param apiKey {object|string}
	 * @returns {Promise.<boolean>}
	 */
	clear (apiKey) {
		return Q.fcall( () => this._clear(apiKey) ).then(
			code => {
				this._log.info('User removed code for ' + code.email);
				return true;
			}
		).catch( err => {
			this._log.error('Check failed: ', err);
			return Q.reject(false);
		});
	}

	/** Returns a random string for secret validation code
	 * @returns {string}
	 */
	_createSecretCode () {
		return crypto.randomBytes(4).toString('hex');
	}

	/** Returns a random string for apiKey
	 * @returns {string}
	 */
	_createApiKey () {
		return crypto.randomBytes(32).toString('hex');
	}

	/** Register a verification code
	 * @param secret {string}
	 * @param email {string}
	 */
	_registerCode (secret, email) {
		debug.assert(secret).is('string');
		this._assertEmail(email);

		const now = new Date();

		const code = this._codes[email] = {
			code: secret,
			email,
			expired: false,
			verified: false,
			initiateTime: now,
			verifyTime: undefined,
			lastCheckTime: undefined
		};

		const apiKey = code.apiKey = this._createApiKey();
		debug.assert(apiKey).is('string');
		this._apiKeys[apiKey] = code;

		return code;
	}

	/** Unregister a code
	 * @param email {string|object} Either the email address as a string or a saved code object with an email property.
	 */
	_unregisterCode (email) {

		email = is.string(email && email.email) ? email.email : email;
		this._assertEmail(email);

		if (_.has(this._codes, email)) {
			const code = this._codes[email];

			if (code.apiKey && _.has(this._apiKeys, code.apiKey)) {
				delete this._apiKeys[code.apiKey];
			}

			delete this._codes[email];
		}

	}

	/** Removes unverified codes after `this._unverifiedTimeout` minutes
	 * @returns {undefined}
	 */
	_clearUnverified () {

		const now = (new Date()).getTime();
		const emails = _.keys(this._codes);

		_.each(emails,
			email => {
				const code = this._codes[email];

				debug.assert(code).is('object');
				debug.assert(code.verified).is('boolean');

				// Ignore verified codes
				if (code.verified) return;

				debug.assert(code.initiateTime).is('date');

				const initiateTime = code.initiateTime.getTime();

				const age = (now - initiateTime) / 1000 / 60;

				// Ignore unexpired codes
				if (age < this._unverifiedTimeout) return;

				this._clear(code);
				this._log.info('Removed unverified code for ' + code.email);

			}
		);

	}

	/** Mark codes as expired after `this._verifiedTimeout` minutes */
	_clearVerified () {

		const now = (new Date()).getTime();
		const emails = _.keys(this._codes);

		_.each(emails,
			email => {
				const code = this._codes[email];

				debug.assert(code).is('object');
				debug.assert(code.verified).is('boolean');

				// Ignore unverified codes
				if (!code.verified) return;

				// Ignore expired codes
				if (code.expired) return;

				debug.assert(code.initiateTime).is('date');

				const initiateTime = code.initiateTime.getTime();

				const age = (now - initiateTime) / 1000 / 60;

				// Ignore unexpired codes
				if (age < this._verifiedTimeout) return;

				code.expired = true;
				this._log.info('Marked a code expired for ' + code.email);

			}
		);

	}

	/** Remove expired codes after `this._expiredTimeout` minutes */
	_clearExpired () {

		const now = (new Date()).getTime();
		const emails = _.keys(this._codes);

		_.each(emails,
			email => {
				const code = this._codes[email];

				debug.assert(code).is('object');
				debug.assert(code.verified).is('boolean');

				// Ignore unverified codes
				if (!code.verified) return;

				// Ignore unexpired codes
				if (!code.expired) return;

				debug.assert(code.initiateTime).is('date');

				const initiateTime = code.initiateTime.getTime();

				const age = (now - initiateTime) / 1000 / 60;

				// Ignore unexpired codes
				if (age < this._expiredTimeout) return;

				this._clear(code);

				this._log.info('Cleared expired code for ' + code.email);
			}
		);

	}

	/** Refresh states, remove expired codes, etc */
	_refresh () {
		this._clearUnverified();
		this._clearVerified();
		this._clearExpired();
		this._refreshInterval();
	}

	/** Assert it is a email */
	_assertEmail (email) {
		debug.assert(email).is('string');
		if (!this._isValidAddress(email)) throw new TypeError("email is invalid: " + email);
	}

}
