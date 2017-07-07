

class Foo {
	constructor (bar) {
		this.bar = bar;
		console.log("new Foo(" + bar + ")")
	}
}


const f = new Foo(123);
const b = Object.assign({}, f);

console.log('f.bar = ', f.bar);
console.log('b.bar = ', b.bar);

console.log('f = ', f);
console.log('b = ', b);
