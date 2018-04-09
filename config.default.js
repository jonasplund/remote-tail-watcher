module.exports = {
  port: 3001,
  localPhpErrors: 'C:\\webserver\\logs\\php_errors.log',
  pollTime: 60,
  listeners: [{
    name: 'prod',
    enabled: true,
    features: {
      gitBranch: {
        enabled: true,
        admin: {
          url: '__URL__',
          username: '__USERNAME__',
          password: '__PASSWORD__' 
        }
      },
      remoteTail: {
        enabled: true,
        ipNumber: '192.168.110.2',
        port: 1685,
        maxLength: 20,
        parserRegex: /(\[\d{2}-[a-zA-Z]{3}-\d{4} \d{2}:\d{2}:\d{2})(?:(?:.|[\r\n])*?\])\s*?(<BB_ERROR(?:_[A-Z_0-9 a-z]+)?>)((?:.|[\r\n])*?)<\/BB_ERROR(?:_[A-Z_0-9 a-z]+)?>/.toString()
      }
    }
  }]
};