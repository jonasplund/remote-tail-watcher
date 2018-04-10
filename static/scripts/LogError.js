const IT_EMPLOYEES = ['Kristoffer Karlsson', 'Victor Jonsson', 'Jon Asplund', 'David Öberg'];

const ERROR_LEVELS = {
  MINOR: ['BANKID', 
    'SQL_SILENT', 
    'Muted failed service request', 
    'ACTIVATION_CODE', 
    'DUMP_RUNNER',
    'DUMMY_WEB_SERVICE_POST_ACTION'
  ],
  STANDARD: ['INDIVIDUAL_FOLKSAM_STATUS_10', 'INDIVIDUAL_NORDNET_STATUS_30'],
  CRITICAL: [
    'PAGE_MASTER_FATAL', 
    'SUMMARY', 
    'INVOICE_CREATOR', 
    'JAYCOM_PULL', 
    'FATAL', 
    'PROGNOSIS_GENERATOR', 
    'FOLKSAM_COMMUNICATOR',
    'FULLMAKTSKOLLEN_NOTIFICATION',
    'GET ALL PORTFOLIOS'
  ]
};


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
