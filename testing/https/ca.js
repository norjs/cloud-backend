
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

/** Returns an object with key and crt as strings */
function createCA (config) {
	return _Q.all([
		_getTempFile("ca.cnf", config),
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

/** */
function createKey (keyFileName) {
	keyFileName = keyFileName || "server-key.pem";
	return _getTempFile(keyFileName).then(keyFile => {
		return _exec(openssl, ["genrsa", "-out", keyFile, "4096"]).then(() => _readFile(keyFile));
	});
}

/** */
function createCSR (config, key, fileNames) {

	if (is.string(fileNames)) {
		fileNames = {name: fileNames};
	}

	fileNames = fileNames || {};
	fileNames.name = fileNames.name || "server";

	return _Q.all([
		_getTempFile(fileNames.config || (fileNames.name + ".cnf"), config),
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

// openssl req -new -config client1.cnf -key client1-key.pem -out client1-csr.pem

function sign (serverConfig, serverCSR, ca, fileNames) {

	if (is.string(fileNames)) {
		fileNames = {name: fileNames};
	}

	fileNames = fileNames || {};
	fileNames.name = fileNames.name || "server";

	return _Q.all([
		_getTempFile(fileNames.config || (fileNames.name + ".cnf"), serverConfig),
		_getTempFile(fileNames.csr || (fileNames.name + "-csr.pem"), serverCSR),
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

// openssl x509 -req -extfile client1.cnf -days 999 -passin "pass:password" -in client1-csr.pem -CA ca-crt.pem
// -CAkey ca-key.pem -CAcreateserial -out client1-crt.pem


// Exports
module.exports = {
	createCA,
	createKey,
	createCSR,
	sign
};