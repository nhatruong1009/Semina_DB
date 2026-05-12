// kafka.js
const { Kafka, Partitioners ,logLevel  } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT ?? "linkedin_clone",
    brokers: [
        `${process.env.KAFKA_HOST ?? "127.0.0.1"}:${process.env.KAFKA_PORT ?? 9092}`
    ],
    logLevel: logLevel.ERROR,
    retry: {
      initialRetryTime: 300,
      retries: 5
    }
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

async function getConsumer(groupId = 'default-group') {
    if (!consumer) {
        consumer = kafka.consumer({ 
            groupId,
            sessionTimeout: 30000,
            heartbeatInterval: 3000,
            rebalanceTimeout: 60000
        });
        await consumer.connect();
    }
    return consumer;
}

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

async function consume(topicOrMap, handler) {
  const c = await getConsumer();
  const topicHandlers = typeof topicOrMap === 'string'
    ? { [topicOrMap]: handler }
    : topicOrMap;

  await c.subscribe({ topics: Object.keys(topicHandlers), fromBeginning: true });

  await c.run({
    eachMessage: async ({ topic, message }) => {
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          let payload = message.value.toString();
          if (message.headers?.isObject?.toString() === 'true') {
            payload = JSON.parse(payload);
          }
          
          const fn = topicHandlers[topic];
          if (fn) await fn(payload);
          break; // Success
        } catch (err) {
          attempts++;
          console.error(`[KAFKA] Attempt ${attempts}/${maxAttempts} failed on topic ${topic}:`, err.message);
          if (attempts === maxAttempts) {
            console.error(`[KAFKA] Final failure for message on ${topic}. Skipping.`);
          } else {
            await new Promise(res => setTimeout(res, 500 * attempts));
          }
        }
      }
    },
  });
}

module.exports = {
    produce,
    consume,
    getProducer,
    getConsumer,
};
