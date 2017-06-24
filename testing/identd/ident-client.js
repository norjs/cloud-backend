
const _Q = require('q');
const net = require('net');

function getUser (serverPort, targetHost, targetPort) {
	return _Q( (resolve, reject) => {
		const client = new net.Socket();

		let response = "";

		client.connect(113, targetHost, () =>{
			console.log('Connected');
			const content = "" + serverPort + ", " + targetPort + "\r\n";
			client.write(content);
		});

		client.on('data', data =>{
			console.log('Received: ' + data);

			response += data;

			client.destroy(); // kill client after server's response
		});

		client.on('close', () =>{
			console.log('Connection closed');
			resolve(response);
		});
	});

}

module.exports = getUser;
