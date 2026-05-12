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
 * Get or create a Kafka consumer.
 *
 * FIX #2 — Environment-based Consumer Group ID:
 * Using a generic hardcoded groupId like 'default-group' is dangerous in distributed
 * systems. Multiple services sharing the same group will compete for partitions and
 * steal messages from each other, causing silent message loss or duplicate processing.
 * Using process.env.KAFKA_GROUP_ID allows each deployment environment (dev/staging/prod)
 * to have its own isolated offset tracking with a sensible fallback.
 *
 * @param {string} groupId - consumer group id
 */
async function getConsumer(groupId = process.env.KAFKA_GROUP_ID || 'linkedin-clone-consumers') {
    if (!consumer) {
        // FIX #3 — Only log initialization in non-production to avoid log flooding.
        // In high-throughput production systems, excessive logging adds I/O pressure
        // and makes it harder to find signal in the noise.
        // Recommendation: replace console.log with a structured logger (pino/winston)
        // that supports log levels, JSON output, and sampling.
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[KAFKA] Initializing consumer with group: ${groupId}`);
        }
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

  // FIX #3 — Gate per-message produce logs behind dev mode.
  // Logging every single Kafka produce call in production is a significant
  // performance anti-pattern. At scale (thousands of events/sec), this alone
  // can saturate stdout buffers and add measurable latency to the hot path.
  // Use a structured logger (pino/winston) with sampling in production instead.
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[KAFKA] Producing to ${topic}`);
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

  // FIX #7 — KEEP fromBeginning: true (intentional architectural decision).
  //
  // WHY this matters in distributed systems:
  // In an event-sourced / CQRS architecture, Kafka topics are the source of truth.
  // If this consumer restarts with a NEW group ID (or if offsets are lost/reset),
  // setting fromBeginning: false means all past events are permanently skipped,
  // leaving Neo4j, MongoDB, and Redis in an inconsistent / partially-built state.
  //
  // Example risk: If the 'user.created' consumer misses events, Neo4j will have
  // no User nodes, breaking ALL graph queries (recommendations, suggestions, feeds).
  //
  // Tradeoffs to manage:
  // - On first boot, replay can be slow → accept this as a one-time cost.
  // - Use idempotent handlers (upsert, not insert) to safely re-process duplicates.
  // - In production, lock group IDs in .env to prevent accidental offset resets.
  // - Use compacted topics or Kafka Streams for stateful replay reduction.
  await c.subscribe({ topics: Object.keys(topicHandlers), fromBeginning: true });

  const sendToDLQ = async ({ topic, partition, message, error }) => {
    try {
      const dlqTopic = `${topic}.DLQ`;
      const p = await getProducer();
      await p.send({
        topic: dlqTopic,
        messages: [{
          value: JSON.stringify({
            original_topic: topic,
            partition,
            offset: message.offset,
            timestamp: message.timestamp,
            payload: message.value.toString(),
            error: error.message,
            stack: error.stack
          })
        }]
      });
    } catch (dlqErr) {
      console.error(`[KAFKA] CRITICAL: Failed to send to DLQ for topic ${topic}:`, dlqErr);
    }
  };

  await c.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        let payload = message.value.toString();
        if (message.headers?.isObject?.toString() === 'true') {
          try {
            payload = JSON.parse(payload);
          } catch (err) {
            throw new Error(`JSON_PARSE_ERROR: ${err.message}`);
          }
        }
        
        const fn = topicHandlers[topic];
        if (!fn) return;

        // Implementation of Fix #2: Timeout and Retry Helper
        const executeWithRetry = async (data, retries = 3, backoff = 1000) => {
          for (let i = 0; i < retries; i++) {
            try {
              // Wrap handler in a timeout to prevent freezing the consumer
              return await Promise.race([
                fn(data),
                new Promise((_, reject) => setTimeout(() => reject(new Error('HANDLER_TIMEOUT')), 10000))
              ]);
            } catch (err) {
              if (i === retries - 1) throw err;
              await new Promise(res => setTimeout(res, backoff * Math.pow(2, i)));
            }
          }
        };

        await executeWithRetry(payload);
      } catch (err) {
        console.error(`[KAFKA] Error processing message on ${topic}:`, err);
        await sendToDLQ({ topic, partition, message, error: err });
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
