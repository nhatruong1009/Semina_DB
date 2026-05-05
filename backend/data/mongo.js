const mongoose = require('mongoose');
const { postSchema } = require('./mongo_shema')
require('dotenv').config();

const crypto = require("crypto");

if (!global.crypto) {
  global.crypto = {
    getRandomValues: (buffer) => {
      const bytes = crypto.randomBytes(buffer.length);
      buffer.set(bytes);
      return buffer;
    }
  };
}

class ConnectionPool {
  constructor(uri, options = {}) {
    this.uri = uri;
    this.options = options;
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
    this.connectPromise = mongoose
      .connect(this.uri, this.options)
      .then(() => {
        this.connected = true;
        console.log(`MongoDB \t ${this.uri}`)
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

  getConnection() {
    return this.connected ? mongoose : false;
  }
}

class MongoDB {
  constructor(pool) {
    this.pool = pool;
    this.post = mongoose.model("Post", postSchema);
  }

  isReady() {
    return this.pool.isConnected();
  }

  getPostModel() {
    return this.isReady() ? this.post : false;
  }

  get Post () {
    const p = this.getPostModel();
    if (!p) throw new Error("Unable to establish a connection to the database.");
    return p;
  }
}

const pool = new ConnectionPool(process.env.MONGO_URI || 'mongodb://localhost:27017/linkedin_clone');

pool.connect().catch((error) => {
  console.error('MongoDB connection failed:', error);
});

const mongoDbInstance = new MongoDB(pool);
module.exports = mongoDbInstance;
