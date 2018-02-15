
const express = require('express');
const http = require('http');
const app = express();
const WebSocket = require('ws');
const RemoteListener = require('./RemoteListener');

module.exports = class App {
	constructor(config) {
		this.config = config;
		
		app.use(express.static('static'));
		this.server = http.createServer(app);
		this.wss = new WebSocket.Server({ 'server': this.server });

		this.listeners = config.listeners.map(listenerConfig => new RemoteListener(listenerConfig));
	}

	async setupListeners() {
		for (let listener of this.listeners) {
			await this.setupListener(listener);
		}
	}

	async setupListener(listener) {
		if (listener.features.gitBranch) {
			await this.pollGitBranch(listener);
			setInterval(_ => {
				this.pollGitBranch(listener); 
			}, this.config.pollTime * 1000);
		}

		if (listener.features.remoteTail) {
			await this.setupTail(listener);			
		}
	}

	async setupServer() {
		this.server.listen(this.config.port, async _ => {
			console.log(`Listening on port ${this.config.port}...`);

			this.wss.on('connection', ws => {
				ws.on('error', ws => {});
				this.sendInitialData(ws, this.listeners);
			});
		});
	}

	broadcastJson(message) {
		this.wss.clients.forEach(client => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(message), err => {});				
			}
		});
	}

	async pollGitBranch(listener) {
		if (!listener.gitBranch) {
			console.log(`Getting ${listener.name} git branch...`);
		}
		const branch = await listener.getGitBranch();
		if (branch !== listener.gitBranch) {
			this.broadcastJson({ 
				env: listener.name, 
				message: branch, 
				type: 'gitBranch' 
			});
			if (listener.gitBranch) {
				console.log(`Git branch on ${listener.name} changed from ${listener.gitBranch} to ${branch}.`);				
			} else {
				console.log(`Git branch on ${listener.name} set to ${branch}.`);				
			}
			listener.gitBranch = branch;
		}
	}

	async setupTail(listener) {
		console.log(`Setting up tail for ${listener.name}...`);
		listener.setupTail();

		listener.on('data', message => {
			/*
			this.phpErrors.consume(message);
			this.broadcastJson({
				env: this.phpErrors.stringify(),
				message: 
			*/
			this.broadcastJson({
				env: listener.name,
				message: listener.buffer.toString(),
				type: 'log'
			});
		});		
	}

	sendInitialData(ws, listeners) {
		listeners.forEach(listener => {
			ws.send(JSON.stringify({ 
				env: listener.name, 
				message: listener.phpErrors.stringify(), 
				type: 'log' 
			}));
			ws.send(JSON.stringify({
				env: listener.name,
				message: listener.phpErrors.unhandled,
				type: 'unhandledLog'
			}));
			ws.send(JSON.stringify({ 
				env: listener.name, 
				message: listener.gitBranch, 
				type: 'gitBranch' 
			}));
		});
	}
}