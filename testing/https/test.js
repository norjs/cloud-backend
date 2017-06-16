

const _Q = require('q');
const fs = require("nor-fs");
const openssl = require("./ca.js");
const debug = require("nor-debug");

const caConfigFile = "./etc/ca.cnf";
const serverConfigFile = "./etc/server.cnf";
const clientConfigFile = "./etc/client.cnf";

const encoding = "utf8";

/** Read a text file */
function _readFile (name) {
	return fs.readFile(name, {encoding});
}

_Q.all([
	_readFile(caConfigFile),
	_readFile(serverConfigFile),
	_readFile(clientConfigFile)
]).spread( (caConfig, serverConfig, clientConfig) => {

	return openssl.createCA(caConfig).then(ca => {
		debug.log("CA => ", ca);

		return openssl.createKey().then(serverKey => {
			debug.log("server key => ", serverKey);

			return openssl.createCSR(serverConfig, serverKey).then( serverCSR => {
				debug.log("serverCSR => ", serverCSR);

				return openssl.sign(serverConfig, serverCSR, ca).then( serverCert => {
					debug.log("serverCert => ", serverCert);

					return openssl.createKey("client1-key.pem").then(clientKey => {
						debug.log("client key => ", clientKey);

						return openssl.createCSR(clientConfig, clientKey, "client1").then( clientCSR => {
							debug.log("clientCSR => ", clientCSR);

							return openssl.sign(clientConfig, clientCSR, ca, "client1").then( clientCert => {
								debug.log("clientCert => ", clientCert);


							});
						});
					});
				});
			});
		});
	});

}).fail(err => {
	debug.error("Error: ", err);
}).done();

