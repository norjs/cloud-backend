
const fs = require('fs');

const https = require('https');

const options = {
	hostname: 'localhost',
	port: 4433,
	path: '/',
	method: 'GET',
	key: fs.readFileSync('./tmp/client1-key.pem'),
	cert: fs.readFileSync('./tmp/client1-crt.pem'),
	ca: fs.readFileSync('./tmp/ca-crt.pem')
};

const req = https.request(options, res =>{
	res.on('data', data =>{
		process.stdout.write(data);
	});
});

req.end();