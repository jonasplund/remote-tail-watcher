const crypto = require('crypto');
const hash = crypto.createHash('sha256');

module.exports = class PhpError {
	constructor(data) {
		const dateStr = data.time.replace(/[\[\]]/g, '');
		this.full = data.full;
		this.dateTime = new Date(dateStr);
		this.type = data.type;
		this.details = data.details;
		this.exceptionClass = data.exceptionClass;
		const userName = data.details.match(/Uname: (.*)/);
		if (userName) {
			this.userName = userName[1];
		}
		let hash = crypto.createHash('sha256');
		hash = hash.update(this.full);
		hash = hash.digest('hex');
		this.hash = hash;
	}

	toObject() {
		return {
			dateTime: this.dateTime,
			type: this.type,
			details: this.details,
			exceptionClass: this.exceptionClass,
			userName: this.userName,
			hash: this.hash
		};
	}

	stringify() {
		return JSON.stringify(this.toObject());
	}
}