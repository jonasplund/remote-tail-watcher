
const express = require('express');
const http = require('http');
const app = express();
const WebSocket = require('ws');
const RemoteListener = require('./RemoteListener');

module.exports = class App {
  constructor(config) {
    this.config = config;
    
    app.use(express.static('static'));

    app.get('/remotes', (req, res) => {
      res.send(this.listeners.map(listener => listener.name));
    });

    this.server = http.createServer(app);
    this.wss = new WebSocket.Server({ 'server': this.server });

    this.listeners = config.
      listeners.
      filter(listenerConfig => listenerConfig.enabled).
      map(listenerConfig => new RemoteListener(listenerConfig));
  }

  async setupListeners() {
    await Promise.all(this.listeners.map(listener => this.setupListener(listener)));
  }

  async setupListener(listener) {
    if (listener.features.gitBranch.enabled) {
      try {
        await this.pollGitBranch(listener);
      } catch (e) {
        console.log('Error while fetching git branch.\n', e);
        return;
      }
      setInterval(_ => {
        this.pollGitBranch(listener); 
      }, this.config.pollTime * 1000);
    }

    if (listener.features.remoteTail.enabled) {
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
      this.broadcastJson({
        env: listener.name,
        message: listener.logErrors.getUnsent().stringify(),
        type: 'log'
      });
      listener.logErrors.setAllAsSent();
    });
  }

  sendInitialData(ws, listeners) {
    listeners.forEach(listener => {
      ws.send(JSON.stringify({ 
        env: listener.name, 
        message: listener.logErrors.stringify(), 
        type: 'log' 
      }));
      ws.send(JSON.stringify({
        env: listener.name,
        message: listener.logErrors.unhandled,
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