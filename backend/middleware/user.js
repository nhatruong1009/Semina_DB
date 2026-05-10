// redisMiddleware.js
const redis = require('../data/redis')

const redisMiddleware = (req, res, next) => {
  try {
    // Example: get user info from Redis
    const userId = req.userId;
    next();
  } catch (err) {
    next(err);
  }
}; 

module.exports = { redisMiddleware };