const SOLIDAR_IT_WORKERS = ['Kristoffer Karlsson', 'Victor Jonsson', 'Jon Asplund', 'David Öberg'];

const errorLevels = {
	MINOR: ['BANKID', 'SQL_SILENT'],
	STANDARD: ['INDIVIDUAL_FOLKSAM_STATUS_10'],
	CRITICAL: ['PAGE_MASTER_FATAL', 'SUMMARY', 'INVOICE_CREATOR', 'JAYCOM_PULL']
};

class App {
	constructor() {
		this.ws = new WebSocket(location.origin.replace(/^https?/, 'ws'));

		this.buffer = '';

		const environments = [{
				name: 'prod',
				node: document.querySelector('#prod .content'),
				search: document.querySelector('#prod .search'),
				filter: document.querySelector('#prod .filter'),
				header: document.querySelector('#prod .header')
			}, {
				name: 'demo2',
				node: document.querySelector('#demo2 .content'),
				search: document.querySelector('#demo2 .search'),
				filter: document.querySelector('#demo2 .filter'),
				header: document.querySelector('#demo2 .header')
			}
		];

		this.servers = environments.map(env => new Server(env));

		this.initEvents();
	}

	initEvents() {
		this.servers.forEach(server => {
			server.search.addEventListener('keyup', e => {
				server.errors.map(error => error.applySearchFilter({ search: server.search.value, typeFilter: server.filter.value }));
			});

			server.filter.addEventListener('change', _ => {
				server.errors.map(error => error.applySearchFilter({ search: server.search.value, typeFilter: server.filter.value }));
			}, false);
		});

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
			} else {
				server.node.innerText += data.message;
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
		this.gitBranch = '';
		this.buffer = '';
		this.errors = new PhpErrors();
	}

	populateSelect(arr) {
		const options = arr.map(item => {
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
		this.buffer = this.buffer + message;
		this.parsePhpErrors();
		this.clearList();
		this.errors.sort((a, b) => a.dateTime - b.dateTime);
		this.errors.forEach(error => this.node.appendChild(error.node));
		if (this.errors) {
			const unique = this.errors.map(item => item.type).filter((value, index, self) => self.indexOf(value) === index);
			this.populateSelect(unique);				
		}
	}

	parsePhpErrors() {
		const regExp = /(\[\d{2}-[a-zA-Z]{3}-\d{4} \d{2}:\d{2}:\d{2})(?:.*\])\s*(<BB_ERROR(?:_[A-Z_0-9]+)?>)([^<]*)<\/BB_ERROR(?:_[A-Z_0-9]+)?>/g;
		this.errors = new PhpErrors();
		let partialResult;
		while ((partialResult = regExp.exec(this.buffer)) !== null) {
			let exceptionClass;
			let type = partialResult[2].replace('<BB_ERROR_', '').replace('<BB_ERROR', 'UNCLASSIFIED').replace('>', '');
			const m = partialResult[3].match(/Exception class: (.*)/);
			if (m) {
				exceptionClass = m[1].split('\\');
				exceptionClass = exceptionClass[exceptionClass.length - 1];
			}
			this.errors.push(new PhpError({
				time: partialResult[1] + ']',
				type: type,
				details: partialResult[3].trim(),
				exceptionClass: exceptionClass
			}));
		}
		return this.errors;
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
		const dateStr = data.time.replace(/[\[\]]/g, '');
		this.dateTime = new Date(dateStr);
		this.type = data.type;
		this.details = data.details;
		this.exceptionClass = data.exceptionClass;
		const userName = data.details.match(/Uname: (.*)/);
		if (userName) {
			this.userName = userName[1];
		}
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
		Object.keys(errorLevels).forEach(key => {
			if (errorLevels[key].indexOf(this.type) > -1) {
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
