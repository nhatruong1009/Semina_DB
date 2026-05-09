const neo4j = require('neo4j-driver');
require('dotenv').config();

class ConnectionPool {
	constructor(uri, auth, options = {}) {
		this.uri = uri;
		this.auth = auth;
		this.options = options;
		this.driver = null;
		this.connected = false;
		this.connecting = false;
		this.connectPromise = null;
	}

	async connect() {
		if (this.connected) {
			return true;
		}

		if (this.connecting) {
			return this.connectPromise;
		}

		this.connecting = true;
		this.connectPromise = Promise.resolve()
			.then(() => {
				this.driver = neo4j.driver(this.uri, this.auth, this.options);
				return this.driver.verifyConnectivity();
			})
			.then(() => {
				this.connected = true;
				console.log(`Neo4j \t ${this.uri}`)
				return true;
			})
			.catch((error) => {
				this.connected = false;
				throw error;
			})
			.finally(() => {
				this.connecting = false;
			});

		return this.connectPromise;
	}

	isConnected() {
		return this.connected;
	}

	getDriver() {
		return this.connected ? this.driver : false;
	}

	session() {
		return this.connected ? this.driver.session() : false;
	}
}

class Neo4j {
	constructor(pool) {
		this.pool = pool;
	}

	isReady() {
		return this.pool.isConnected();
	}

	getSession() {
		return this.isReady() ? this.pool.session() : false;
	}

	async Query(query, params = {}) {
		const session = this.getSession();
		if (!session) throw new Error("Unable to establish a connection to the database.");
		try {
			const result = await session.run(query, this._coerceIntegers(params));
			return result.records;
		} finally {
			await session.close();
		}
	}

	// Neo4j rejects JS floats (e.g. 10.0) for LIMIT/SKIP — coerce all integer-valued
	// numbers to neo4j.int so the driver sends them as Long, not Double.
	_coerceIntegers(params) {
		const out = {};
		for (const [k, v] of Object.entries(params)) {
			out[k] = (typeof v === 'number' && Number.isInteger(v)) ? neo4j.int(v) : v;
		}
		return out;
	}
}

const pool = new ConnectionPool(
	process.env.NEO4J_URI || 'bolt://localhost:7687',
	neo4j.auth.basic( process.env.NEO4J_USER || 'neo4j', 
										process.env.NEO4J_PASSWORD || 'password123')
);

pool.connect().catch((error) => {
	console.error('Neo4j connection failed:', error);
});

const neo4jInstance = new Neo4j(pool);
module.exports = neo4jInstance;