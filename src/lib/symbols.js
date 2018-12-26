/**
 *
 * @type {{method: {HEAD: *, DELETE: *, POST: *, GET: *, PUT: *}}}
 */
export const SYMBOLS = {
	/**
	 * A function implemented as one of these symbols is a custom HTTP method handler.
	 */
	method: {

		/**
		 * A function implemented as this symbol is a custom HTTP method handler.
		 *
		 * HTTP GET method implementation.
		 *
		 * Function should be implemented as `function(context)` where context is cloud-backend context object.
		 */
		GET: Symbol('GET implementation'),

		/**
		 * A function implemented as this symbol is a custom HTTP method handler.
		 *
		 * HTTP HEAD method implementation.
		 *
		 * Function should be implemented as `function(context)` where context is cloud-backend context object.
		 */
		HEAD: Symbol('HEAD implementation'),

		/**
		 * A function implemented as this symbol is a custom HTTP method handler.
		 *
		 * HTTP POST method implementation.
		 *
		 * Function should be implemented as `function(context)` where context is cloud-backend context object.
		 */
		POST: Symbol('POST implementation'),

		/**
		 * A function implemented as this symbol is a custom HTTP method handler.
		 *
		 * HTTP PUT method implementation.
		 *
		 * Function should be implemented as `function(context)` where context is cloud-backend context object.
		 */
		PUT: Symbol('PUT implementation'),

		/**
		 * A function implemented as this symbol is a custom HTTP method handler.
		 *
		 * HTTP DELETE method implementation.
		 *
		 * Function should be implemented as `function(context)` where context is cloud-backend context object.
		 */
		DELETE: Symbol('DELETE implementation'),

		/**
		 * A function implemented as this symbol is a custom HTTP method handler.
		 *
		 * HTTP PATCH method implementation.
		 *
		 * Function should be implemented as `function(context)` where context is cloud-backend context object.
		 */
		PATCH: Symbol('PATCH implementation'),

		/**
		 * A function implemented as this symbol is a custom HTTP method handler.
		 *
		 * HTTP OPTIONS method implementation.
		 *
		 * Function should be implemented as `function(context)` where context is cloud-backend context object.
		 */
		OPTIONS: Symbol('OPTIONS implementation')

	}
};

export default SYMBOLS;
