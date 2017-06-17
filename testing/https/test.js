

const _Q = require('q');
const fs = require("nor-fs");
const openssl = require("./ca.js");
const debug = require("nor-debug");

const workingDir = "./tmp";

const encoding = "utf8";

/** Read a text file */
function _readFile (name) {
	return fs.readFile(name, {encoding});
}

process.chdir(workingDir);

const createCA = () => openssl.createCAConfig().then(caConfig => openssl.createCA(caConfig));
const createKey = name => openssl.createKey(name + "-key.pem");
const createCSR = (commonName) => _Q.all([openssl.createCertConfig(commonName), createKey(commonName)]).spread( (config, key) => openssl.createCSR(config, key, commonName) );
const signCert = (ca, csr, commonName) => openssl.createCertConfig(commonName).then( config => openssl.sign(config, csr, ca, commonName) );

_Q.all([
	createCA(),
	createCSR("localhost"),
	createCSR("client1")
]).spread( (caConfig, serverCSR, clientCSR) => {

	debug.log("CA => ", ca);
	debug.log("serverCSR => ", serverCSR);
	debug.log("clientCSR => ", clientCSR);

	return _Q.all([
		signCert(ca, serverCSR, "localhost"),
		signCert(ca, clientCSR, "client1")
	]).spread( (serverCert, clientCert) => {
		debug.log("serverCert => ", serverCert);
		debug.log("clientCert => ", clientCert);
	});

}).fail(err => {
	debug.error("Error: ", err);
}).done();

