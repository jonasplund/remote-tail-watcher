const LogError = require('./LogError');

module.exports = class LogErrors extends Array {
  constructor(maxLength, parserRegex, ...args) {
    super(...args);

    this.buffer = '';
    this.unhandled = '';
    this.maxLength = maxLength;
    this.parserRegex = parserRegex;
  }

  consume(message) {
    this.buffer += message;
    const regExp = this.regexifyString(this.parserRegex);    
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

  regexifyString(regexString) {
    const match = /\/(.*)?\/([a-z]*)?/.exec(regexString);
    return new RegExp(match[1], match[2]);
  }
}