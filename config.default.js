module.exports = {
	port: 3001,
	localPhpErrors: 'C:\\webserver\\logs\\php_errors.log',
	pollTime: 60,
	maxErrorCount: 100,
	listeners: [{
		name: 'prod',
		enabled: true,
		ipNumber: '192.168.110.2',
		port: 1685,
		admin: {
			url: 'admin.solidarfond.se',
			username: '__USERNAME__',
			password: '__PASSWORD__' 
		},
		features: {
			gitBranch: true,
			remoteTail: true
		}
	}]
};