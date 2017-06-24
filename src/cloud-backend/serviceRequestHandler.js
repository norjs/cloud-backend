
import _ from 'lodash';
import is from 'nor-is';

/** Send a reply in JSON format */
const jsonReply = content => {
	return JSON.stringify(content, null, 2) + "\n";
};

/** Build a HTTP(s) request handler for a MicroService */
const serviceRequestHandler = serviceInstance => {
	return (req, res) => {

		const remoteAddress = _.get(req, 'connection.remoteAddress');
		const peerCert = req.socket && req.socket.getPeerCertificate();
		const cn = _.get(peerCert, 'subject.CN');
		const method = req.method;
		const url = req.url;

		console.log(new Date() + ' ' + remoteAddress + ' ' + cn + ' ' + method + ' ' + url);

		const properties = Object.keys(serviceInstance);
		const methods = properties.filter(key => is.func(serviceInstance[key]));
		const members = properties.filter(key => !is.func(serviceInstance[key]));

		if (url === "/") {
			let body = {};
			members.forEach( member => {
				body[member] = serviceInstance[member];
			});

			res.writeHead(200);
			res.end( jsonReply(body) );
		}

	};
};

export default serviceRequestHandler;