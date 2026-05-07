// kafka.js
const { Kafka } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT ?? "linkedin_clone",
    brokers: [
        `${process.env.KAFKA_HOST ?? "127.0.0.1"}:${process.env.KAFKA_PORT ?? 9092}`
    ],
});

// Connection pool: keep one producer and one consumer instance
let producer;
let consumer;

/**
 * Get or create a Kafka producer
 */
async function getProducer() {
    if (!producer) {
        producer = kafka.producer();
        await producer.connect();
    }
    return producer;
}

/**
 * Get or create a Kafka consumer
 * @param {string} groupId - consumer group id
 */
async function getConsumer(groupId = 'default-group') {
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
    await p.send({
        topic,
        messages: [{ key: message.key || null, value: JSON.stringify(message) }],
    });
}

/**
 * Consume messages from a topic
 * @param {string} topic
 * @param {function} handler - callback for each message
 */
async function consume(topic, handler) {
    const c = await getConsumer();
    await c.subscribe({ topic, fromBeginning: true });

    await c.run({
        eachMessage: async ({ topic, partition, message }) => {
            handler({
                key: message.key?.toString(),
                value: message.value.toString(),
                headers: message.headers,
            });
        },
    });
}

module.exports = {
    produce,
    consume,
    getProducer,
    getConsumer,
};
