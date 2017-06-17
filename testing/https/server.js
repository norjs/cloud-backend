
const fs = require('fs');

const https = require('https');

const options = {
	key: fs.readFileSync('./tmp/server-key.pem'),
	cert: fs.readFileSync('./tmp/server-crt.pem'),
	ca: fs.readFileSync('./tmp/ca-crt.pem'),
	requestCert: true,
	rejectUnauthorized: true
};

https.createServer(options, (req, res) =>{
	console.log(new Date()+' '+
		req.connection.remoteAddress+' '+
		req.socket.getPeerCertificate().subject.CN+' '+
		req.method+' '+req.url);
	res.writeHead(200);
	res.end("hello world\n");
}).listen(4433);
