const { produce, consume } = require('../event/kafka');

async function publishEvent(topic, payload) {
  // TODO: validate event payload and enqueue it to Kafka.
}

async function collectUserDomainEvent(userEvent) {
  // TODO: route authentication/profile events into Kafka for the PostgreSQL pipeline.
}

async function collectPostDomainEvent(postEvent) {
  // TODO: route user post events into Kafka for the MongoDB pipeline.
}

async function collectInteractionDomainEvent(interactionEvent) {
  // TODO: route user interactions into Kafka for the Neo4j pipeline.
}

async function startDataCollectors() {
  // TODO: initialize Kafka consumers and attach topic handlers.
}

async function handlePostgresEvent(message) {
  // TODO: consume events and persist them into PostgreSQL.
}

async function handleMongoEvent(message) {
  // TODO: consume events and persist them into MongoDB.
}

async function handleNeo4jEvent(message) {
  // TODO: consume events and persist them into Neo4j.
}

module.exports = {
  publishEvent,
  collectUserDomainEvent,
  collectPostDomainEvent,
  collectInteractionDomainEvent,
  startDataCollectors,
  handlePostgresEvent,
  handleMongoEvent,
  handleNeo4jEvent,
};
