process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const configUser = require('./config.js');
const configDefault = require('./config.default.js');
const objectMerge = require('object-merge');
const App = require('./classes/App.js');


(async function () {
	const app = new App(objectMerge(configDefault, configUser));
	await app.setupListeners();
	await app.setupServer();
})();
