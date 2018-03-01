const LogError = require('./LogError');

module.exports = class LogErrors extends Array {
	constructor(...args) {
		super(...args);

		this.buffer = '';
		this.unhandled = '';
	}

	consume(message) {
		this.buffer += message;
		//const regExp = /(\[\d{2}-[a-zA-Z]{3}-\d{4} \d{2}:\d{2}:\d{2})(?:.*\])\s*(<BB_ERROR(?:_[A-Z_0-9 a-z]+)?>)((?:.|\n)*?)<\/BB_ERROR(?:_[A-Z_0-9 a-z]+)?>/g;
		const regExp = /(\[\d{2}-[a-zA-Z]{3}-\d{4} \d{2}:\d{2}:\d{2})(?:.*?\])\s*(<BB_ERROR(?:_[A-Z_0-9a-z ]+)?>)(.*?)<\/BB_ERROR(?:_[A-Z_0-9a-z ]+)?>/gs;
		let partialResult;
		while ((partialResult = regExp.exec(this.buffer)) !== null) {
			if (!partialResult || !partialResult[0]) {
				continue;
			}
			let exceptionClass, userName;
			let type = partialResult[2].replace('<BB_ERROR_', '').replace('<BB_ERROR', 'UNCLASSIFIED').replace('>', '');
			let m = partialResult[3].match(/Exception class: (.*)/);
			if (m) {
				exceptionClass = m[1].split('\\');
				exceptionClass = exceptionClass[exceptionClass.length - 1];
			}
			m = partialResult[3].match(/Uname: (.*)/);
			if (m) {
				userName = m[1];
			}
			const error = new LogError({
				type,
				userName,
				full: partialResult[0],
				time: partialResult[1] + ']',
				details: partialResult[3].trim(),
				exceptionClass: exceptionClass
			});
			if (this.filter(item => item.hash === error.hash).length === 0) {
				this.push(error);
			}
		}
		let unhandled = this.buffer;
		this.forEach(item => unhandled = unhandled.replace(item.full, ''));
		this.unhandled = unhandled.replace('remote-tail>>>', '').replace(/\n+/g, '\n').trim();
	}

	stringify() {
		return JSON.stringify(this.toObjectArray());
	}

	toObjectArray() {
		const objectArray = this.map(item => item.toObject());
		objectArray.unhandled = this.unhandled;
		return objectArray;
	}

	getUnsent() {
		return this.filter(item => !item.sent);
	}

	setAllAsSent() {
		this.forEach(item => item.sent = true);
	}
}