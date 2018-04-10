const MASH = {
  INTERNAL_NAME: '__mash',
  DISPLAY_NAME: 'Mashed view'
};

const MESSAGE_TYPES = {
  LOG: 'log',
  GIT_BRANCH: 'gitBranch',
  UNHANDLED_LOG: 'unhandledLog'
};



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

  addError(error) {
    this.errors.push(error);
    if (error.errorDateTime.getDate() > this.lastDate.getDate() &&
      error.errorDateTime > this.lastDate) {
      this.insertDivider(error.errorDateTime);
    }
    this.lastDate = error.errorDateTime;
    this.contentNode.appendChild(error.node.cloneNode(true));
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
