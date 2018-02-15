const SOLIDAR_IT_WORKERS = ['Kristoffer Karlsson', 'Victor Jonsson', 'Jon Asplund', 'David Öberg'];

const ErrorLevels = {
	MINOR: ['BANKID', 'SQL_SILENT'],
	STANDARD: ['INDIVIDUAL_FOLKSAM_STATUS_10'],
	CRITICAL: ['PAGE_MASTER_FATAL', 'SUMMARY', 'INVOICE_CREATOR', 'JAYCOM_PULL', 'FATAL']
};

class App {
	constructor() {
		this.ws = new WebSocket(location.origin.replace(/^https?/, 'ws'));

		const environmentsConfig = [{
				name: 'prod',
				node: document.querySelector('#prod .content'),
				unhandledContainer: document.querySelector('#prod .unhandledContainer'),
				unhandledContent: document.querySelector('#prod .unhandledContent'),
				unhandledContentToggle: document.querySelector('#prod .toggle-unhandled'),
				search: document.querySelector('#prod .search'),
				filter: document.querySelector('#prod .filter'),
				header: document.querySelector('#prod .header')
			}, {
				name: 'demo2',
				node: document.querySelector('#demo2 .content'),
				unhandledContainer: document.querySelector('#demo2 .unhandledContainer'),
				unhandledContent: document.querySelector('#demo2 .unhandledContent'),
				unhandledContentToggle: document.querySelector('#demo2 .toggle-unhandled'),
				search: document.querySelector('#demo2 .search'),
				filter: document.querySelector('#demo2 .filter'),
				header: document.querySelector('#demo2 .header')
			}
		];

		this.servers = environmentsConfig.map(env => new Server(env));

		this.initEvents();
	}

	initEvents() {
		this.ws.onmessage = event => {
			const data = JSON.parse(event.data);

			let server = this.servers.filter(server => data.env === server.name);
			if (server.length === 0) {
				return;
			}
			server = server[0];

			if (data.type === 'log') {
				server.consumeLogMessage(data.message);
			} else if (data.type === 'gitBranch') {
				server.gitBranch = data.message;
			} else if (data.type === 'unhandledLog') {
				server.consumeUnhandledLogMessage(data.message);
			}
		};
	}
}

class Server {
	constructor(settings) {
		this.name = settings.name;
		this.node = settings.node;
		this.search = settings.search;
		this.filter = settings.filter;
		this.header = settings.header;
		this.unhandledContentToggle = settings.unhandledContentToggle;
		this.unhandledContent = settings.unhandledContent;
		this.unhandledContainer = settings.unhandledContainer;
		this.gitBranch = '';
		this.buffer = '';
		this.errors = new PhpErrors();

		this.initEvents();
	}

	initEvents() {
		this.search.addEventListener('keyup', e => {
			this.errors.map(error => error.applySearchFilter({ search: server.search.value, typeFilter: server.filter.value }));
		});

		this.filter.addEventListener('change', _ => {
			this.errors.map(error => error.applySearchFilter({ search: server.search.value, typeFilter: server.filter.value }));
		}, false);

		console.log(this);

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

	populateSelect(arr) {
		const unique = this.errors.map(item => item.type).filter((value, index, self) => self.indexOf(value) === index);
		const options = unique.map(item => {
			const element = document.createElement('option');
			element.textContent = item;
			element.value = item;
			this.filter.appendChild(element);
		});
	}

	clearList(list) {
		this.node.querySelectorAll('li').forEach(li => list.removeChild(li));
	}

	consumeLogMessage(message) {
		this.clearList();
		const messageJson = JSON.parse(message);
		messageJson.forEach(error => this.errors.push(new PhpError(error)));
		this.errors.sort((a, b) => a.dateTime - b.dateTime);
		this.errors.forEach(error => this.node.appendChild(error.node));
		this.populateSelect();
	}

	consumeUnhandledLogMessage(message) {
		this.unhandledContent.innerText = message;
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
	constructor(data) {
		this.full = data.full;
		this.dateTime = new Date(data.dateTime);
		this.type = data.type;
		this.details = data.details;
		this.exceptionClass = data.exceptionClass;
		this.userName = data.userName;
		this.node = this.createListElement();
		this.addErrorLevelClass();
	}

	createListElement() {
		const li = document.createElement('li');
		li.innerText = `[${this.dateTime.toLocaleString('sv-SE')}] ${this.type} ${this.exceptionClass ? this.exceptionClass : ''} ${this.userName ? '[' + this.userName + ']' : ''}`;
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
		Object.keys(ErrorLevels).forEach(key => {
			if (ErrorLevels[key].indexOf(this.type) > -1) {
				errorLevel = key;
			}
		});
		if (SOLIDAR_IT_WORKERS.indexOf(this.userName) > -1) {
			errorLevel = 'MINOR';
		}
		if (errorLevel !== undefined) {
			this.node.classList.add(errorLevel.toLowerCase());
		}
	}
}

(function() {
	new App();
})();
