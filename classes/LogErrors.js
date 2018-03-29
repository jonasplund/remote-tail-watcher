const LogError = require('./LogError');

module.exports = class LogErrors extends Array {
	constructor(maxLength, ...args) {
		super(...args);

		this.buffer = '';
		this.unhandled = '';
		this.maxLength = maxLength;
	}

	consume(message) {
		this.buffer += message;
		const regExp = /(\[\d{2}-[a-zA-Z]{3}-\d{4} \d{2}:\d{2}:\d{2})(?:(?:.|[\r\n])*?\])\s*?(<BB_ERROR(?:_[A-Z_0-9 a-z]+)?>)((?:.|[\r\n])*?)<\/BB_ERROR(?:_[A-Z_0-9 a-z]+)?>/g;
		let partialResult;
		while ((partialResult = regExp.exec(this.buffer)) !== null) {
			if (!partialResult || !partialResult[0]) {
				continue;
			}
			let exceptionClass, userName;
			const time = partialResult[1] + ']';
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
				time,
				full: partialResult[0],
				details: partialResult[3].trim(),
				exceptionClass: exceptionClass
			});
			if (this.filter(item => item.hash === error.hash).length === 0) {
				this.push(error);
				if (!!this.maxLength && this.length > this.maxLength) {
					this.splice(0, this.length - this.maxLength);
				}
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