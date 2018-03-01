const crypto = require('crypto');

module.exports = class LogError {
	constructor(data) {
		const dateStr = data.time.replace(/[\[\]]/g, '');
		this.full = data.full;
		this.errorDateTime = new Date(dateStr);
		this.type = data.type;
		this.details = data.details;
		this.exceptionClass = data.exceptionClass;
		this.userName = data.userName;

		let hash = crypto.createHash('sha256');
		hash = hash.update(this.full);
		hash = hash.digest('hex');
		this.hash = hash;
	}

	toObject() {
		return {
			errorDateTime: this.errorDateTime,
			type: this.type,
			details: this.details,
			exceptionClass: this.exceptionClass,
			userName: this.userName,
			hash: this.hash,
			full: this.full
		};
	}

	stringify() {
		return JSON.stringify(this.toObject());
	}
}