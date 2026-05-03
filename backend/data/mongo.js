const mongoose = require('mongoose');
require('dotenv').config();

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
    this.Post = mongoose.model('Post', new mongoose.Schema({ content: String }), 'posts');
  }

  isReady() {
    return this.pool.isConnected();
  }

  getPostModel() {
    return this.isReady() ? this.Post : false;
  }

  sayHi() {
    return this.isReady() ? 'Hello, MongoDB' : false;
  }
}

const pool = new ConnectionPool(process.env.MONGO_URI || 'mongodb://localhost:27017/linkedin_clone');

pool.connect().catch((error) => {
  console.error('MongoDB connection failed:', error);
});

const mongoDbInstance = new MongoDB(pool);
module.exports = mongoDbInstance;
