

const _Q = require('q');
const fs = require("nor-fs");
const openssl = require("./openssl.js");
const debug = require("nor-debug");

const workingDir = "./tmp";

process.chdir(workingDir);

_Q.all([
	openssl.createCA(),
	openssl.createKey("localhost"),
	openssl.createKey("client1")
]).spread( (ca, serverKey, clientKey) => {

	debug.log("openssl => ", ca);
	debug.log("serverKey => ", serverKey);
	debug.log("clientKey => ", clientKey);

	return _Q.all([
		openssl.createCSR("localhost", serverKey),
		openssl.createCSR("client1", serverKey)
	]).spread( (serverCSR, clientCSR) => {

		debug.log("serverCSR => ", serverCSR);
		debug.log("clientCSR => ", clientCSR);

		return _Q.all([
			openssl.signCert(ca, serverCSR, "localhost"),
			openssl.signCert(ca, clientCSR, "client1")
		]).spread( (serverCert, clientCert) => {
			debug.log("serverCert => ", serverCert);
			debug.log("clientCert => ", clientCert);
		});

	});

}).fail(err => {
	debug.error("Error: ", err);
}).done();
