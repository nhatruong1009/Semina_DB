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
        console.log(`PostgreSQL \t ${this.config.host}:${this.config.port}`)
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

  // this is async function for query
  // we should wrap it into try catch in the most outer function
  Query(query, args = []) {
    const client = this.getClient();
    if (!client) throw new Error("Unable to establish a connection to the database.");

    return client.query(query, args)
      .then(result => result)
      .catch(err => { throw new Error(err.message); });
  }
}

const pool = new ConnectionPool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
  database: process.env.PG_DATABASE || 'linkedin_clone'
});

pool.connect().catch((error) => {
  console.error('PostgreSQL connection failed:', error);
});

const postgresqlInstance = new PostgreSQL(pool);
module.exports = postgresqlInstance;