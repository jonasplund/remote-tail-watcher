const IT_EMPLOYEES = ['Kristoffer Karlsson', 'Victor Jonsson', 'Jon Asplund', 'David Öberg'];

const ERROR_LEVELS = {
	MINOR: ['BANKID', 'SQL_SILENT', 'Muted failed service request', 'ACTIVATION_CODE'],
	STANDARD: ['INDIVIDUAL_FOLKSAM_STATUS_10'],
	CRITICAL: ['PAGE_MASTER_FATAL', 'SUMMARY', 'INVOICE_CREATOR', 'JAYCOM_PULL', 'FATAL', 'PROGNOSIS_GENERATOR']
};

const MESSAGE_TYPES = {
	LOG: 'log',
	GIT_BRANCH: 'gitBranch',
	UNHANDLED_LOG: 'unhandledLog'
};

const environmentsConfig = [{
		name: 'prod',
		base: document.querySelector('#prod')
	}, {
		name: 'demo2',
		base: document.querySelector('#demo2')
	}
].map(item => ({
	name: item.name,
	base: item.base,
	node: item.base.querySelector('.content'),
	unhandledContainer: item.base.querySelector('.unhandled-container'),
	unhandledContent: item.base.querySelector('.unhandled-content'),
	unhandledContentToggle: item.base.querySelector('.toggle-unhandled'),
	search: item.base.querySelector('.search'),
	filter: item.base.querySelector('.filter'),
	header: item.base.querySelector('.header')
}));

class App {
	constructor() {
		this.inited = false;
		this.ws = new WebSocket(location.origin.replace(/^https?/, 'ws'));

		this.servers = environmentsConfig.map(env => new Server(env));

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
		};
	}
}

class Server {
	constructor(settings) {
		this.name = settings.name;
		this.base = settings.base;
		this.node = settings.node;
		this.search = settings.search;
		this.filter = settings.filter;
		this.header = settings.header;
		this.unhandledContentToggle = settings.unhandledContentToggle;
		this.unhandledContent = settings.unhandledContent;
		this.unhandledContainer = settings.unhandledContainer;
		this.gitBranch = '';
		this.errors = new PhpErrors();

		this.lastDate = 0;

		this.initEvents();
	}

	initEvents() {
		this.search.addEventListener('keyup', _ => this.applySearchFilter(), false);
		this.filter.addEventListener('change', _ => this.applySearchFilter(), false);

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

	applySearchFilter() {
		this.errors.map(error => error.applySearchFilter({ 
			search: this.search.value, 
			typeFilter: this.filter.value
		}));
	}

	clearList() {
		this.node.querySelectorAll('li').forEach(li => this.node.removeChild(li));
	}

	consumeMessage(data) {
		if (data.type === MESSAGE_TYPES.LOG) {
			this.consumeLogMessage(data.message, data.inited);
		} else if (data.type === MESSAGE_TYPES.GIT_BRANCH) {
			this.gitBranch = data.message;
		} else if (data.type === MESSAGE_TYPES.UNHANDLED_LOG) {
			this.consumeUnhandledLogMessage(data.message);
		}
	}

	consumeLogMessage(message, inited) {
		JSON.parse(message).forEach(error => {
			error = new PhpError(error, inited);
			this.errors.push(error);
			if (error.dateTime.getDate() > this.lastDate) {
				this.insertDivider(error.dateTime);
			}
			this.lastDate = error.dateTime.getDate();
			this.node.appendChild(error.node);
		});
		this.populateSelect();
	}

	populateSelect(arr) {
		this.errors.
			map(item => item.type).
			filter((value, index, self) => self.indexOf(value) === index).
			forEach(item => {
				const element = document.createElement('option');
				element.textContent = item;
				element.value = item;
				this.filter.appendChild(element);
			});
	}

	consumeUnhandledLogMessage(message) {
		this.unhandledContent.innerText += message;
	}

	insertDivider(dateTime) {
		const dateHeader = document.createElement('li');
		dateHeader.innerText = `[${dateTime.toLocaleString('sv-SE').substr(0,10)}]`;
		dateHeader.classList.add('date-header');
		this.node.appendChild(dateHeader);
	} 

	set gitBranch(branch) {
		this.header.innerText = `${this.name} [${branch}]`;
	}
}

class PhpErrors extends Array {
	constructor(...args) {
		super(...args);
	}
}

class PhpError {
	constructor(data, inited) {
		this.recievedTime = new Date();
		this.full = data.full;
		this.dateTime = new Date(data.dateTime);
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
		li.innerText = this.toString();
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
		return `[${this.dateTime.toLocaleString('sv-SE')}] ${this.type} ${this.exceptionClass ? this.exceptionClass : ''} ` + 
			`${this.userName ? '[' + this.userName + ']' : ''}`;
	}

	get isHidden() {
		return this.node.style.display === 'none';
	}

	get isExpanded() {
		return this.detailsElement.style.display === 'block';
	}

	expand(scroll = true) {
		this.detailsElement.style.display = 'block';
		if (scroll) {
			this.node.scrollIntoView({ behavior: 'smooth' });
		}
	}

	unexpand() {
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
		if (searchFilter.search !== '' && this.details.toLowerCase().indexOf(searchFilter.search.toLowerCase()) < 0) {
			hide = true;
		} 
		if (searchFilter.typeFilter !== '' && this.type !== searchFilter.typeFilter) { 
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

(function() {
	window.remoteTailWatcher = new App();
})();
