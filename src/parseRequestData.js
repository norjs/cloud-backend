
import Q from 'q';

/** */
export default function parseRequestData (req) {
	return Q.Promise((resolve, reject) => {

		let errorListener, endListener;
		let body = '';

		const dataListener = data => {

			body += data;

			// Too much POST data, kill the connection!
			// 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
			if (body.length > 1e6) {
				req.removeListener('error', errorListener);
				req.removeListener('end', endListener);
				req.connection.destroy();
				reject(new Error("Too much POST data detected. Connection closed."));
			}
		};

		endListener = () =>{
			req.removeListener('error', errorListener);
			resolve(body);
		};

		errorListener = err =>{
			req.removeListener('end', endListener);
			reject(err);
		};

		req.on('data', dataListener);
		req.once('end', endListener);
		req.once('error', errorListener);

	});
}
