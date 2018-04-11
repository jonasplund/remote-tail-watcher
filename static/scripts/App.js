const environmentsConfig = [{
    name: 'prod'
  }, {
    name: 'demo'
  }
];

class App {
  constructor(settings) {
    this.toggleDarkMode(false);
    this.element = settings.root;
    this.template = settings.template;
    this.inited = false;
    this.ws = new WebSocket(location.origin.replace(/^https?/, 'ws'));

    this.servers = environmentsConfig.map(env => new Server(env, this.element, this.template));
    if (settings.useMash) {
      this.mash = new Server({ name: MASH.INTERNAL_NAME }, this.element, this.template);      
    }
    this.toggleMash(false);

    this.initEvents();
  }

  initEvents() {
    // FIXME: More intelligent init
    window.setTimeout(_ => this.inited = true, 3000);
    this.ws.onmessage = event => {
      const data = JSON.parse(event.data);

      let server = this.servers.filter(server => data.env === server.name);
      if (server.length === 0) {
        return;
      }
      server = server[0];

      data.inited = this.inited;
      server.consumeMessage(data);
      if (this.mash) {
        this.mash.consumeMessage(data, server.name);        
      }
    };

    const darkmodeButton = document.querySelector('#darkmode');
    darkmodeButton.addEventListener('change', _ => this.toggleDarkMode(darkmodeButton.checked));
    const mashButton = document.querySelector('#mash');
    mashButton.addEventListener('change', _ => this.toggleMash(mashButton.checked));
  }

  toggleDarkMode(darkMode) {
    const rootNode = document.querySelector('html');
    if (darkMode) {
      rootNode.classList.add('dark');
      rootNode.classList.remove('light');
    } else  {
      rootNode.classList.add('light');
      rootNode.classList.remove('dark');
    }
  }

  toggleMash(mash) {
    if (mash) {
      const mashedList = this.generateMash();
      this.mash.clearList();
      mashedList.forEach(error => this.mash.addError(error));
      this.element.classList.add('mash');
    } else {
      this.element.classList.remove('mash');
    }
  }

  generateMash() {
    return this.servers.
      map(server => server.errors).
      reduce((a, b) => [].concat(a, b)).
      sort((a, b) => a.errorDateTime - b.errorDateTime);
  }
}
