const MASH = {
  INTERNAL_NAME: '__mash',
  DISPLAY_NAME: 'Mashed view'
};

const IT_EMPLOYEES = ['Kristoffer Karlsson', 'Victor Jonsson', 'Jon Asplund', 'David Öberg'];

const ERROR_LEVELS = {
  MINOR: ['BANKID', 'SQL_SILENT', 'Muted failed service request', 'ACTIVATION_CODE', 'DUMP_RUNNER'],
  STANDARD: ['INDIVIDUAL_FOLKSAM_STATUS_10', 'INDIVIDUAL_NORDNET_STATUS_30'],
  CRITICAL: [
    'PAGE_MASTER_FATAL', 
    'SUMMARY', 
    'INVOICE_CREATOR', 
    'JAYCOM_PULL', 
    'FATAL', 
    'PROGNOSIS_GENERATOR', 
    'FOLKSAM_COMMUNICATOR'
  ]
};

const MESSAGE_TYPES = {
  LOG: 'log',
  GIT_BRANCH: 'gitBranch',
  UNHANDLED_LOG: 'unhandledLog'
};

const environmentsConfig = [{
    name: 'prod'
  }, {
    name: 'demo2'
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

    document.querySelector('body').addEventListener('mousemove', _ => this.showSettings());
    const darkmodeButton = document.querySelector('#darkmode');
    darkmodeButton.addEventListener('change', _ => this.toggleDarkMode(darkmodeButton.checked));
    const mashButton = document.querySelector('#mash');
    mashButton.addEventListener('change', _ => this.toggleMash(mashButton.checked));
  }

  showSettings() {
    const settingsElement = document.querySelector('#settings');
    settingsElement.classList.add('visible');
    clearTimeout(this.showSettingsTimeout);
    this.showSettingsTimeout = setTimeout(_ => this.hideSettings(), 2000);
  }

  hideSettings() {
    const settingsElement = document.querySelector('#settings');
    settingsElement.classList.remove('visible');  
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
      this.element.classList.add('mash');
    } else  {
      this.element.classList.remove('mash');
    }
  }
}

class Server {
  constructor(settings, parent, template) {
    this.name = settings.name;
    this.template = template;
    this.parent = parent;

    this.errors = new LogErrors();
    this.lastDate = new Date(0);

    this.renderTemplate();
    this.gitBranch = '';

    this.notifier = new Notifier();

    this.initEvents();
  }

  initEvents() {
    this.search.addEventListener('keyup', _ => this.applySearchFilter(), false);
    this.filter.addEventListener('selected-item-changed', _ => this.applySearchFilter());

    this.collapseButton.addEventListener('click', _ => this.unexpandAll());

    this.unhandledContentToggle.addEventListener('click', _ => {
      if (this.unhandledContainer.style.display === 'none') {
        this.unhandledContentToggle.classList.add('active');
        this.unhandledContainer.style.display = 'block';
      } else {
        this.unhandledContentToggle.classList.remove('active');
        this.unhandledContainer.style.display = 'none';
      }
    });
  }

  renderTemplate() {
    const templateContent = this.template.content;
    const clone = document.importNode(templateContent, true);

    this.base = clone.querySelector('.server');
    this.contentNode = clone.querySelector('.content');
    this.unhandledContainer = clone.querySelector('.unhandled-container');
    this.unhandledContent = clone.querySelector('.unhandled-content');
    this.unhandledContentToggle = clone.querySelector('.toggle-unhandled');
    this.search = clone.querySelector('.search');
    this.filter = clone.querySelector('.filter');
    this.filterDropdown = clone.querySelector('.filter-dropdown');
    this.header = clone.querySelector('.header');
    this.collapseButton = clone.querySelector('.collapse-button');

    this.header.textContent = this.name === MASH.INTERNAL_NAME ? MASH.DISPLAY_NAME : this.name;
    this.base.setAttribute('id', this.name);

    this.parent.appendChild(clone);
  }

  applySearchFilter() {
    setTimeout(_ => {
      const searchValue = this.search.value || '';
      this.errors.map(error => error.applySearchFilter({
        search: searchValue, 
        typeFilter: this.filterDropdown.value
      }));
    }, 0);
  }

  clearList() {
    this.contentNode.querySelectorAll('li').forEach(li => this.contentNode.removeChild(li));
  }

  consumeMessage(data, origin) {
    if (data.type === MESSAGE_TYPES.LOG) {
      this.consumeLogMessage(data.message, data.inited, origin);
    } else if (data.type === MESSAGE_TYPES.GIT_BRANCH) {
      this.gitBranch = data.message;
    } else if (data.type === MESSAGE_TYPES.UNHANDLED_LOG) {
      this.consumeUnhandledLogMessage(data.message);
    }
  }

  consumeLogMessage(message, inited, origin = undefined) {
    JSON.parse(message).forEach(error => {
      error = new LogError(error, inited, origin);
      this.errors.push(error);
      this.errors.sort((a, b) => a.errorDateTime - b.errorDateTime);
      this.notifier.notify(this.name, error);
      if (error.errorDateTime.getDate() > this.lastDate.getDate() &&
        error.errorDateTime > this.lastDate) {
        this.insertDivider(error.errorDateTime);
      }
      this.lastDate = error.errorDateTime;
      /*if (this.name === MASH.INTERNAL_NAME) {
        let insertBeforeNode = null;
        for (let i = 0; i < this.errors.length; i++) {
          let currError = this.errors[i];
          if (error.errorDateTime > currError.errorDateTime) {
            //console.log(error.errorDateTime, currError.errorDateTime);
            insertBeforeNode = currError.node;
            break;
          }
        }
        if (insertBeforeNode) {
          this.contentNode.insertBefore(error.node, insertBeforeNode);
        } else {
          this.contentNode.appendChild(error.node);
        }
      } else { */
        this.contentNode.appendChild(error.node);
      //}
    });
    this.populateSelect();
  }

  populateSelect(arr) {
    let i = 2;
    while (this.filter.childNodes[i]) {
      this.filter.removeChild(this.filter.childNodes[i++]);
    }
    this.errors.
      map(item => item.type).
      filter((value, index, self) => self.indexOf(value) === index).
      forEach(item => {
        const element = document.createElement('paper-item');
        element.textContent = item;
        this.filter.appendChild(element);
      });
  }

  consumeUnhandledLogMessage(message) {
    this.unhandledContent.innerText += message;
  }

  insertDivider(errorDateTime) {
    const dateHeader = document.createElement('li');
    dateHeader.innerText = `[${this.formatDate(errorDateTime)}]`;
    dateHeader.classList.add('date-header');
    this.contentNode.appendChild(dateHeader);
  }

  formatDate(errorDateTime) {
    const nowDate = (new Date()).getDate();
    const errorDate = errorDateTime.getDate();
    let day;
    if (errorDate === nowDate) {
      day = 'Idag, ';
    } else if (errorDate === nowDate - 1) {
      day = 'Igår, ';
    }
    return (day || '') + errorDateTime.toLocaleString('sv-SE').substr(0, 10);
  }

  unexpandAll() {
    this.errors.forEach(item => item.unexpand());
  }

  set gitBranch(branch) {
    if (this.name === MASH.INTERNAL_NAME) {
      this.header.innerText = `${MASH.DISPLAY_NAME}`;
    } else {
      this.header.innerText = `${this.name} ${branch ? '[' + branch + ']' : ''}`;
    }
  }
}

class LogErrors extends Array {
  constructor(...args) {
    super(...args);
  }
}

class LogError {
  constructor(data, inited, origin) {
    this.origin = origin;
    this.recievedTime = new Date();
    this.full = data.full;
    this.errorDateTime = new Date(data.errorDateTime);
    this.type = data.type;
    this.details = data.details;
    this.exceptionClass = data.exceptionClass;
    this.userName = data.userName;
    this.hash = data.hash;
    this.node = this.createListElement();
    this.addErrorLevelClass();
    if (inited) {
      this.setAsNew();
    }
  }

  createListElement() {
    const li = document.createElement('li');
    li.classList.add('log-error');
    li.innerHTML = this.toString();
    li.innerHTML += '<span class="dropdown-arrow">&#x25BA;</span>'
    
    this.detailsElement = document.createElement('pre');
    this.detailsElement.style.display = 'none';
    this.detailsElement.innerText = this.details;
    li.appendChild(this.detailsElement);
    li.addEventListener('click', e => {
      if (e.target !== this.detailsElement) {
        if (this.isExpanded) {
          this.unexpand();
        } else {
          this.expand(); 
        }
      }
    });
    return li;
  }

  toString() {
    return `<span class="date">${this.origin ? '[' + this.origin + '] ' : ''}[${this.formatDate()}]</span> ${this.type} ` + 
      `${this.exceptionClass ? this.exceptionClass : ''} ${this.userName ? '[' + this.userName + ']' : ''}`;
  }

  formatDate() {
    let day;
    const errorDate = this.errorDateTime.getDate();
    const nowDate = (new Date()).getDate();
    if (errorDate === nowDate) {
      day = 'Idag';
    } else if (errorDate === nowDate - 1) {
      day = 'Igår';
    } else {
      day = this.errorDateTime.toLocaleString('sv-SE').substr(0, 10);
    }
        return day + ' ' + this.errorDateTime.toLocaleString('sv-SE').substr(10);
  }

  get isHidden() {
    return this.node.style.display === 'none';
  }

  get isExpanded() {
    return this.detailsElement.style.display === 'block';
  }

  expand(scroll = true) {
    this.node.classList.add('open');
    this.detailsElement.style.display = 'block';
    if (scroll) {
      this.node.scrollIntoView({ behavior: 'smooth' });
    }
  }

  unexpand() {
    this.node.classList.remove('open')
    this.detailsElement.style.display = 'none';
  }

  show() {
    this.node.style.display = 'block';
  }

  hide() {
    this.node.style.display = 'none';
  }

  setAsNew() {
    this.node.classList.add('new');
    Beeper.beep(Beeper.BEEP_TYPES.default);
    setTimeout(_ => this.node.classList.remove('new'), 5000);
  }

  applySearchFilter(searchFilter) {
    let hide = false;
    // console.log(searchFilter);
    if (searchFilter.search !== '' && this.details.toLowerCase().indexOf(searchFilter.search.toLowerCase()) < 0) {
      hide = true;
    } 
    if (searchFilter.typeFilter !== 'None' && this.type !== searchFilter.typeFilter) { 
      hide = true;
    }
    if (hide) {
      this.hide();
    } else {
      this.show();
    }
  }

  addErrorLevelClass() {
    let errorLevel;
    Object.keys(ERROR_LEVELS).forEach(key => {
      if (ERROR_LEVELS[key].indexOf(this.type) > -1) {
        errorLevel = key;
      }
    });
    if (IT_EMPLOYEES.indexOf(this.userName) > -1) {
      errorLevel = 'MINOR';
    }
    if (errorLevel !== undefined) {
      this.node.classList.add(errorLevel.toLowerCase());
    }
  }
}

class Beeper {
  static beep(beepType) {
    if (beepType) {
      beepType.play();
    } else {
      Beeper.defaultBeep.play();
    }
  }

  static get BEEP_TYPES() {
    return {
      'default': Beeper.defaultBeep
    };
  }

  static get defaultBeep() {
    return new Audio('data:audio/wav;base64,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' + 
      'VmoWFSJkWFxX4FFRQWR+LsS4W/rFRb///////////////////////////////////////////////////////////////////////////////////////////////////' + 
      '/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////' + 
      '/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////' + 
      '////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAA' + 
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=');
  }
}

let notifierInstance = null;
class Notifier {
  constructor() {
    if (!notifierInstance) {
      notifierInstance = this;
    }
    this.mostRecentDateTime = new Date();
    return notifierInstance;
  }

  async notify(server, logError) {
    if (new Date() - this.mostRecentDateTime > 5000) {
      const notificationText = `New error on ${server}:\n${logError.exceptionClass || logError.errorType}`;
      if (Notification.permission === 'granted') {
        new Notification(notificationText);
        this.mostRecentDateTime = new Date();
      } else if (Notification.permission !== 'denied') {
        if (Notification.requestPermission() === 'granted') {
          new Notification(notificationText);
          this.mostRecentDateTime = new Date();
        }
      }
    }
  }
}

(function() {
  window.remoteTailWatcher = new App({
    root: document.querySelector('#app'), 
    template: document.querySelector('#server-template'),
    useMash: true
  });
})();
