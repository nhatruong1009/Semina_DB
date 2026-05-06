const mongoose = require('mongoose');
const { postSchema, commentSchema, reactionSchema } = require('./mongo_schema');
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
    if (this.connected) return true;
    if (this.connecting) return this.connectPromise;

    this.connecting = true;

    this.connectPromise = mongoose
      .connect(this.uri, {
        maxPoolSize: 10,
        ...this.options
      })
      .then(() => {
        this.connected = true;
        console.log(`MongoDB \t ${this.uri}`);
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
}

class MongoDB {
  constructor(pool) {
    this.pool = pool;

    this._Post = mongoose.model("Post", postSchema, "posts");
    this._Comment = mongoose.model("Comment", commentSchema, "comments");
    this._Reaction = mongoose.model("Reaction", reactionSchema, "reactions");
  }

  isReady() {
    return this.pool.isConnected();
  }

  get Post() {
    if (!this.isReady()) throw new Error("MongoDB not connected");
    return this._Post;
  }

  get Comment() {
    if (!this.isReady()) throw new Error("MongoDB not connected");
    return this._Comment;
  }

  get Reaction() {
    if (!this.isReady()) throw new Error("MongoDB not connected");
    return this._Reaction;
  }

  isReady() { return this.pool.isConnected(); }
}

const pool = new ConnectionPool(
  process.env.MONGO_URI || 'mongodb://localhost:27017/linkedin_clone'
);

pool.connect().catch((error) => {
  console.error('MongoDB connection failed:', error);
});

module.exports = new MongoDB(pool);