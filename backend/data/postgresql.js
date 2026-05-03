const { Client } = require('pg');
require('dotenv').config();

class ConnectionPool {
  constructor(config) {
    this.config = config;
    this.client = null;
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
        this.client = new Client(this.config);
        return this.client.connect();
      })
      .then(() => {
        this.connected = true;
        console.log(`${this.config.host} connected`)
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

  getClient() {
    return this.connected ? this.client : false;
  }
}

class PostgreSQL {
  constructor(pool) {
    this.pool = pool;
  }

  isReady() {
    return this.pool.isConnected();
  }

  getClient() {
    return this.isReady() ? this.pool.getClient() : false;
  }

  sayHi() {
    return this.isReady() ? 'Hello, PostgreSQL' : false;
  }
}

const pool = new ConnectionPool({
  host: process.env.PG_HOST || 'localhost',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
  database: process.env.PG_DATABASE || 'linkedin_clone'
});

pool.connect().catch((error) => {
  console.error('PostgreSQL connection failed:', error);
});

const postgresqlInstance = new PostgreSQL(pool);
module.exports = postgresqlInstance;