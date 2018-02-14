module.exports = {
	port: 3001,
	localPhpErrors: 'C:\\webserver\\logs\\php_errors.log',
	pollTime: 60,
	listeners: [{
		name: 'prod',
		ipNumber: '192.168.110.2',
		admin: {
			url: 'admin.solidarfond.se',
			username: '__USERNAME__',
			password: '__PASSWORD__' 
		},
		features: {
			gitBranch: true,
			remoteTail: true
		}
	}, {
		name: 'demo2',
		ipNumber: '192.168.10.21',
		admin: {
			url: 'test2-admin.solidar.se',
			username: '__USERNAME__',
			password: '__PASSWORD__' 
		},
		features: {
			gitBranch: true,
			remoteTail: true
		}
	}]
};