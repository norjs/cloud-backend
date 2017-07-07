/** Create unique IDs based on object content */

import _ from 'lodash';
import debug from 'nor-debug';
import crypto from 'crypto';
import uuidv5 from 'uuid/v5';

/** This is UUIDv5 namespace for generating UUIDs for cloud objects */
const CLOUD_OBJECT_NAMESPACE = '95997416-503b-440d-ae19-cd60db51ab5a';

/** Get sha256 hash for data */
function calculateBodyHash (data) {
	return crypto.createHmac('sha256', 'a secret').update(data).digest('hex');
}

/** Create an UUID based on data */
export function createBodyIDs (body) {
	debug.assert(body).is('object');
	body = _.cloneDeep(body);
	if (_.has(body, '$id')) delete body.$id;
	if (_.has(body, '$hash')) delete body.$hash;
	if (_.has(body, '$prototype')) delete body.$prototype;
	body = JSON.stringify(body);
	const hash = calculateBodyHash(body);
	const id = uuidv5(hash, CLOUD_OBJECT_NAMESPACE); //.toLowerCase();
	return [id, hash];
}
