module.exports = {
	port: 3001,
	localPhpErrors: 'C:\\webserver\\logs\\php_errors.log',
	pollTime: 60,
	listeners: [{
		name: 'prod',
		enabled: true,
		ipNumber: '192.168.110.2',
		port: 1685,
		maxLength: 20,
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