module.exports = {
	port: 3001,
	localPhpErrors: 'C:\\webserver\\logs\\php_errors.log',
	remotes: [{
		name: 'prod',
		ipNumber: '192.168.110.2',
		adminUser: {
			url: 'https://admin.solidarfond.se',
			username: '__USERNAME__',
			password: '__PASSWORD__' 
		},
	}, {
		name: 'demo2',
		ipNumber: '192.168.10.21',
		admin: {
			url: 'https://test2-admin.solidarfond.se',
			username: '__USERNAME__',
			password: '__PASSWORD__' 
		},
	}]
};