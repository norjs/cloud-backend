
const fs = require('fs');

const https = require('https');

const options = {
	key: fs.readFileSync('./tmp/localhost-key.pem'),
	cert: fs.readFileSync('./tmp/localhost-crt.pem'),
	ca: fs.readFileSync('./tmp/ca-crt.pem'),
	requestCert: true,
	rejectUnauthorized: true
};

https.createServer(options, (req, res) => {

	const remoteAddress = req.connection.remoteAddress;
	const cn = req.socket.getPeerCertificate().subject.CN;
	const method = req.method;
	const url = req.url;

	console.log(new Date() + ' ' + remoteAddress+' '+ cn + ' ' + method + ' ' + url);

	res.writeHead(200);
	res.end("hello world\n");

}).listen(4433);
