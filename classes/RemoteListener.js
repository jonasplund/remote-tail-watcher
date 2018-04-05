const request = require('request');
const remoteTailClient = require('remote-tail/lib/Client.js');
const EventEmitter = require('events');
const LogErrors = require('./LogErrors');

module.exports = class RemoteListener extends EventEmitter {
  constructor(settings) {
    super();
    this.name = settings.name;
    this.ipNumber = settings.features.remoteTail.ipNumber;
    this.hostname = settings.features.remoteTail.hostname;
    this.admin = settings.features.gitBranch.admin;
    this.port = settings.port || 1685;
    this.features = settings.features || {};
    this.logErrors = new LogErrors(settings.features.remoteTail.maxLength);
    this.tail = undefined;
    this.gitBranch = undefined;
  }

  getGitBranch() {
    return new Promise((resolve, reject) => {
      let options = { 
        url: `https://${this.admin.url}/login`, 
        formData: { 
          'user': this.admin.username, 
          'pass': this.admin.password 
        },
        followRedirect: false 
      };
      request.post(options, (err, httpResponse, body) => {
        if (err) {
          return reject('HTTP error while attempting to log in.', err);
        }
        let cookie = httpResponse.headers['set-cookie'];
        if (cookie === undefined || cookie.length < 1) {
          return reject('No set-cookie header received.');
        }
        cookie = cookie[0];

        options = {
          url: `https://${this.admin.url}/system/info`,
          headers: {
            'cookie': cookie 
          }
        };
        request.get(options, (err, httpResponse, body) => {
          if (err) {
            return reject('HTTP error while getting system info.', err);
          }
          const m = body.match(/<strong>Status<\/strong><br>(?:On branch|HEAD detached at) (.*)/);
          return m ? resolve(m[1]) : reject('Unable to find branch');
        });
      });
    });
  }

  setupTail() {
    this.tail = remoteTailClient.initiate(this.ipNumber, this.port);
    this.tail.on('error', error => {
      throw new Error(`Connection to ${this.name} (${this.ipNumber}:${this.port}) lost.`);
    });
    this.tail.on('data', message => {
      this.logErrors.consume(message, this.name === 'prod');
      this.emit('data', this.logErrors.stringify());
    });
  }
};