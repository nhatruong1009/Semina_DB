const Redis = require('ioredis');
require('dotenv').config();

class ConnectionPool {
  constructor(options = {}) {
    this.options = options;
    this.redis = null;
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
        this.redis = new Redis(this.options);
        return new Promise((resolve, reject) => {
          this.redis.on('ready', () => resolve());
          this.redis.on('error', (error) => reject(error));
          setTimeout(() => reject(new Error('Redis connection timeout')), 5000);
        });
      })
      .then(() => {
        this.connected = true;
        console.log(`${this.options.host}:${this.options.port} connected`)
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
    return this.connected ? this.redis : false;
  }
}

class RedisDB {
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
    return this.isReady() ? 'Hello, RedisDB' : false;
  }
}

const pool = new ConnectionPool({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379
});

pool.connect().catch((error) => {
  console.error('Redis connection failed:', error);
});

const redisInstance = new RedisDB(pool);
module.exports = redisInstance;