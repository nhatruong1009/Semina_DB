const psql = require('./data/postgresql')
const mongosh = require('./data/mongo')
const neo4j_client = require('./data/neo4j')
const redis = require('./data/redis')

module.exports = {
    psql,
    mongosh,
    neo4j_client,
    redis
}