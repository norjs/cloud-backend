
const _Q = require("q");
const is = require("nor-is");
const fs = require("nor-fs");
const _exec = require('nor-exec');
const debug = require('nor-debug');

const encoding = 'utf8';
const openssl = "openssl";

/** Read a text file */
function _readFile (name) {
	return fs.readFile(name, {encoding});
}

///** Read a text file */
//function _readJSON (name) {
//	return _readFile(name).then(data => JSON.parse(data));
//}

/** Write a text file */
function _writeFile (name, content) {
	return fs.writeFile(name, content, {encoding});
}

/** Get a temporary file with optional contents
 * @param name The name for the file.
 * @param content This is the optional content for the file. Unless it is a string or undefined, it will be converted to it as JSON.
 */
function _getTempFile (name, content) {
	return _Q.fcall(() => {
		debug.assert(name).is('string');

		if ( (content !== undefined) && (!is.string(content)) ) {
			content = JSON.stringify(content);
		}

		if (content) {
			debug.log("content = ", content);
			return _writeFile(name, content || "").then(() => name);
		}

		return name;
	});
}

/** Returns an object with key and crt as strings
 * @param config {string} The OpenSSL configuration for generating CA
 * @returns {Promise} of object with `key` and `crt` string properties
 */
function createCA (config) {
	return _Q.all([
		encodeConfig(config).then( encodedConfig => _getTempFile("ca.cnf", encodedConfig) ),
		_getTempFile("ca-key.pem"),
		_getTempFile("ca-crt.pem")
	]).spread( (configFile, keyOutFile, crtOutFile) => {
		debug.assert(openssl).is('string');
		debug.assert(configFile).is('string');
		debug.assert(keyOutFile).is('string');
		debug.assert(crtOutFile).is('string');

		const args = [
			'req',
			'-new',
			'-x509',
			'-days', '9999',
			'-config', configFile,
			'-keyout', keyOutFile,
			'-out', crtOutFile
		];

		debug.log("Calling with args = ", args);

		return _exec(openssl, args).then(() => {
			return _Q.all([
				_readFile(keyOutFile),
				_readFile(crtOutFile)
			]).spread((key, crt) => {
				debug.log("key = ", key);
				debug.log("crt = ", crt);
				return {key, crt};
			});
		});
	});
}

/** Generate a private key
 * @param keyFileName {string} Default name for temporary key file
 * @returns {Promise} The private key as string
 */
function createKey (keyFileName) {
	keyFileName = keyFileName || "server-key.pem";
	return _getTempFile(keyFileName).then(keyFile => {
		return _exec(openssl, ["genrsa", "-out", keyFile, "4096"]).then(() => _readFile(keyFile));
	});
}

/** Generate a certificate signing request
 * @param config {string} OpenSSL configuration for signing
 * @param key {string} Private key for certificate
 * @param fileNames {string|object} Default name as a string for generated temporary files or an object to specify names for each of them.
 * @param {Promise} Generated CSR as string
 */
function createCSR (config, key, fileNames) {

	if (is.string(fileNames)) {
		fileNames = {name: fileNames};
	}

	fileNames = fileNames || {};
	fileNames.name = fileNames.name || "server";

	return _Q.all([
		encodeConfig(config).then( encodedConfig => _getTempFile(fileNames.config || (fileNames.name + ".cnf"), encodedConfig) ),
		_getTempFile(fileNames.key || (fileNames.name + "-key.pem"), key),
		_getTempFile(fileNames.csr || (fileNames.name + "-csr.pem"))
	]).spread( (configFile, keyOutFile, crtOutFile) => {
		return _exec(openssl, [
			"req",
			"-new",
			"-config", configFile,
			"-key", keyOutFile,
			"-out", crtOutFile
		]).then(() => _readFile(crtOutFile));
	});

}

/** Sign a certificate
 * @param config {string} The openssl configuration for signing
 * @param csr {string} The openssl signing request
 * @param ca {object} CA object
 * @param ca.crt {string} CA certificate
 * @param ca.key {string} CA private key
 * @param fileNames {string|object} Default name as a string for generated temporary files or an object to specify names for each of them.
 * @returns {Promise} The signed certificate as string
 */
function sign (config, csr, ca, fileNames) {

	if (is.string(fileNames)) {
		fileNames = {name: fileNames};
	}

	fileNames = fileNames || {};
	fileNames.name = fileNames.name || "server";

	return _Q.all([
		encodeConfig(config).then( encodedConfig => _getTempFile(fileNames.config || (fileNames.name + ".cnf"), encodedConfig) ),
		_getTempFile(fileNames.csr || (fileNames.name + "-csr.pem"), csr),
		_getTempFile(fileNames.caCrt || "ca-crt.pem", ca.crt),
		_getTempFile(fileNames.caKey || "ca-key.pem", ca.key),
		_getTempFile(fileNames.crt || (fileNames.name + "-crt.pem")),
	]).spread( (serverConfigFile, serverCSRFile, caCertFile, caKeyFile, serverCertFile) => {
		return _exec(openssl, [
			"x509",
			"-req",
			"-extfile", serverConfigFile,
			"-days", "999",
			"-passin", "pass:password",
			"-in", serverCSRFile,
			"-CA", caCertFile,
			"-CAkey", caKeyFile,
			"-CAcreateserial",
			"-out", serverCertFile
		]).then(() => _readFile(serverCertFile));
	});
}

/** Returns OpenSSL configuration for a CA */
function createCAConfig () {
	return _Q.when({
		"ca": {
			"default_ca": "CA_default"
		},
		"CA_default": {
			"serial": "ca-serial",
			"crl": "ca-crl.pem",
			"database": "ca-database.txt",
			"name_opt": "CA_default",
			"cert_opt": "CA_default",
			"default_crl_days": 9999,
			"default_md": "md5"
		},
		"req": {
			"default_bits": 4096,
			"days": 9999,
			"distinguished_name": "req_distinguished_name",
			"attributes": "req_attributes",
			"prompt": "no",
			"output_password": "password"
		},
		"req_distinguished_name": {
			"C": "FI",
			"ST": "FI",
			"L": "Oulu",
			"O": "Sendanor",
			"OU": "Cloud Backend",
			"CN": "ca",
			"emailAddress": "info@sendanor.com"
		},
		"req_attributes": {
			"challengePassword": "test"
		}
	});
}

/** Returns OpenSSL configuration for a certificate with a `commonName` */
function createCertConfig (commonName) {
	return _Q.when({
		"req": {
			"default_bits": 4096,
			"days": 9999,
			"distinguished_name": "req_distinguished_name",
			"attributes": "req_attributes",
			"prompt": "no",
			"x509_extensions": "v3_ca"
		},
		"req_distinguished_name": {
			"C": "FI",
			"ST": "FI",
			"L": "Oulu",
			"O": "Sendanor",
			"OU": "Cloud Backend",
			"CN": commonName,
			"emailAddress": "info@sendanor.com"
		},
		"req_attributes": {
			"challengePassword": "password"
		},
		"v3_ca": {
			"authorityInfoAccess": "@issuer_info"
		},
		"issuer_info": {
			"OCSP;URI.0": "http://ocsp.sendanor.com/",
			"caIssuers;URI.0": "http://sendanor.com/ca.cert"
		}
	});
}

/** Convert OpenSSL configuration object into OpenSSL configuration string */
function encodeConfig (config) {
	return _Q.when(Object.keys(config).map(key => {
		return "[ " + key + " ]\n" + Object.keys(config[key]).map(key2 => key2 + ' = ' + config[key][key2]).join("\n") + "\n";
	}).join("\n"));
}



// Exports
module.exports = {
	createCA: () => createCAConfig().then(caConfig => createCA(caConfig)),
	createKey: name => createKey(name + "-key.pem"),
	createCSR: (commonName, key) => createCertConfig(commonName).then( config => createCSR(config, key, commonName) ),
	signCert: (ca, csr, commonName) => createCertConfig(commonName).then( config => sign(config, csr, ca, commonName) )
};