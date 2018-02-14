const PhpError = require('./PhpError');

module.exports = class PhpErrors extends Array {
	constructor(...args) {
		super(...args);

		this.buffer = '';
		this.unhandled = '';
	}

	consume(message) {
		this.buffer += message;
		const regExp = /(\[\d{2}-[a-zA-Z]{3}-\d{4} \d{2}:\d{2}:\d{2})(?:.*\])\s*(<BB_ERROR(?:_[A-Z_0-9]+)?>)([^<]*)<\/BB_ERROR(?:_[A-Z_0-9]+)?>/g;
		let partialResult;
		while ((partialResult = regExp.exec(this.buffer)) !== null) {
			let exceptionClass;
			let type = partialResult[2].replace('<BB_ERROR_', '').replace('<BB_ERROR', 'UNCLASSIFIED').replace('>', '');
			const m = partialResult[3].match(/Exception class: (.*)/);
			if (m) {
				exceptionClass = m[1].split('\\');
				exceptionClass = exceptionClass[exceptionClass.length - 1];
			}
			const error = new PhpError({
				full: partialResult[0],
				time: partialResult[1] + ']',
				type: type,
				details: partialResult[3].trim(),
				exceptionClass: exceptionClass
			}); 
			if (this.filter(item => {
				return item.hash === error.hash
			}).length === 0) {
				this.push(error);
			} else {
			}
		}
		let unhandled = this.buffer;
		this.forEach(item => unhandled = unhandled.replace(item, ''));
		this.unhandled = unhandled;
	}

	stringify() {
		return JSON.stringify(this.toObjectArray());
	}

	toObjectArray() {
		return this.map(item => item.toObject());
	}
}