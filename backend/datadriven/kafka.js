// kafka.js
const { Kafka, Partitioners ,logLevel  } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT ?? "linkedin_clone",
    brokers: [
        `${process.env.KAFKA_HOST ?? "127.0.0.1"}:${process.env.KAFKA_PORT ?? 9092}`
    ],
    logLevel: logLevel.ERROR,
});

// Connection pool: keep one producer and one consumer instance
let producer;
let consumer;

/**
 * Get or create a Kafka producer
 */
async function getProducer() {
    if (!producer) {
        producer = kafka.producer({
            createPartitioner: Partitioners.LegacyPartitioner
        });
        await producer.connect();
    }
    return producer;
}

/**
 * Get or create a Kafka consumer
 * @param {string} groupId - consumer group id
 */
async function getConsumer(groupId = 'backend-group-1') {
    if (!consumer) {
        consumer = kafka.consumer({ groupId });
        await consumer.connect();
    }
    return consumer;
}

/**
 * Produce a message to a topic
 * @param {string} topic
 * @param {object} message
 */
async function produce(topic, message) {
  const p = await getProducer();

  let value;
  let isObject = false;

  if (typeof message === 'object' && message !== null) {
    value = JSON.stringify(message);
    isObject = true;
  } else {
    value = String(message);
  }

  return await p.send({
    topic,
    messages: [{
      value,
      headers: { isObject: isObject ? 'true' : 'false' }
    }],
  });
}

/**
 * Consume messages from one or more topics.
 * @param {string | Object.<string, function>} topicOrMap - single topic string or map of { topic: handler }
 * @param {function} [handler] - required when topicOrMap is a string
 */
async function consume(topicOrMap, handler) {
  const c = await getConsumer();

  const topicHandlers = typeof topicOrMap === 'string'
    ? { [topicOrMap]: handler }
    : topicOrMap;

  await c.subscribe({ topics: Object.keys(topicHandlers), fromBeginning: true });

  await c.run({
    eachMessage: async ({ topic, message }) => {
      let payload = message.value.toString();
      if (message.headers?.isObject?.toString() === 'true') {
        try {
          payload = JSON.parse(payload);
        } catch (err) {
          console.error("Failed to parse JSON payload:", payload, err);
        }
      }
      const fn = topicHandlers[topic];
      if (fn) await fn(payload);
    },
  });
}


module.exports = {
    produce,
    consume,
    getProducer,
    getConsumer,
};
