const { produce, consume } = require('./kafka');
const Neo4j = require('../query/neo4j');

const USER_CREATED = 'user.created';

async function publishEvent(topic, payload) {
  // TODO: validate event payload and enrich with metadata before sending.
  return produce(topic, payload);
}


// implement
async function publishUserCreated(payload) {
  return publishEvent(USER_CREATED, payload);
}

async function consumeUserCreated(payload) {
  console.log(`consumeUserCreated ${payload.user_id} ${payload.email}`);
  await Neo4j.createUser(payload.user_id, payload.full_name, payload.headline || '');
}

// setup
async function startDataCollectors() {
  await consume(USER_CREATED, consumeUserCreated);
}

module.exports = {
  publishEvent,
  startDataCollectors,
  publishUserCreated,
};
