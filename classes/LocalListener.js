const request = require('request');
const remoteTailClient = require('remote-tail/lib/Client.js');
const EventEmitter = require('events');

module.exports = class LocalListener extends EventEmitter {
  constructor(settings) {
    super();
    this.name = settings.name;
    this.ipNumber = settings.ipNumber;
    this.hostname = settings.hostname;
    this.admin = settings.admin;
    this.port = settings.port || 1685;
    this.buffer = '';
    this.tail = undefined;
    this.gitBranch = undefined;
  }

  async getGitBranch() {
    return '';
  }

  setupTail() {
    const localWatcher = fs.watchFile(LOCAL_PHP_ERRORS, _ => {
      const currentRead = fs.readFileSync(LOCAL_PHP_ERRORS, 'utf-8');
      const diff = currentRead.replace(lastRead, '');
      lastRead = currentRead;
      localBuffer = lastRead;
      if (diff) {
        broadcastJson({ 
          env: 'local',
          message: diff,
          type: 'log'
        });
      }
    });
  }
};