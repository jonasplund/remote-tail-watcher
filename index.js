process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const http = require('http');
const app = express();
const WebSocket = require('ws');
const remoteTailClient = require('remote-tail/lib/Client.js');
const fs = require('fs');
const config = require('./config.js');
const r2 = require('r2');
const FormData = require('form-data');
const request = require('request');
const util = require('util');
const Remote = require('./classes/Remote.js');


(async function () {
	const LOCAL_PHP_ERRORS = config.localPhpErrors;
	const PORT = config.port;

	app.use(express.static('static'));

	const server = http.createServer(app);
	const wss = new WebSocket.Server({ server });

	const remotes = config.remotes.map(remoteConfig => new Remote(remoteConfig));

	remotes.forEach(async remote => {
		console.log(`Getting ${remote.name} git branch...`);
		remote.gitBranch = await remote.getGitBranch();
		console.log(`Setting up remote tail for ${remote.name}...`);
		remote.setupRemoteTail();

		remote.on('data', message => {
			broadcastJson({
				env: remote.name,
				message: remote.buffer.toString(),
				type: 'log'
			});
		});

		setInterval(async _ => remote.gitBranch = await remote.getGitBranch(), 3600000);
	});

	server.listen(PORT, async _ => {
		console.log(`Listening on port ${PORT}...`);
		let lastRead = fs.readFileSync(LOCAL_PHP_ERRORS);

		let localBuffer = lastRead;

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

		wss.on('connection', ws => {
			ws.on('error', ws => {});
			remotes.forEach(remote => {
				ws.send(JSON.stringify({ 
					env: remote.name, 
					message: remote.buffer.toString(), 
					type: 'log' 
				}));
				ws.send(JSON.stringify({ 
					env: remote.name, 
					message: remote.gitBranch.toString(), 
					type: 'gitBranch' 
				}));
			});
		});
	});

	function broadcastJson(message) {
		wss.clients.forEach(client => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(message), err => {});				
			}
		});
	}
})();
