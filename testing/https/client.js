
const fs = require('fs');

const https = require('https');

const options = {
	hostname: 'localhost',
	port: 4433,
	path: '/',
	method: 'GET',
	ca: fs.readFileSync('ca-crt.pem')
};

const req = https.request(options, res =>{
	res.on('data', data =>{
		process.stdout.write(data);
	});
});

req.end();