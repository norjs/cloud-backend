
var _ = require('lodash');

var funcs = [
	(req, res, next) => {
		console.log("#1 req=", req, " res=", res);
		return next();
	},
	(req, res, next) => {
		console.log("#2 req=", req, " res=", res);
		return next();
	},
	(req, res, next) => {
		console.log("#3 req=", req, " res=", res);
		return next();
	},
	(req, res, next) => {
		console.log("#4 req=", req, " res=", res);
		return "hello";
	}
];

var func = _.reduce(
	funcs,
	(a, b) => (req, res, next) => a(req, res, err => {
		if(err !== undefined) throw err;
		return b(req, res, next);
	})
);

var ret = func("a", "b", () => {
	console.log('End');
});

console.log("ret = " + ret);