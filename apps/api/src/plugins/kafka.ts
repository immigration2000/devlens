import fp from 'fastify-plugin';
import { Kafka, Producer } from 'kafkajs';
import type { FastifyInstance } from 'fastify';

let kafkaAvailable = false;

const kafkaPlugin = fp(async (fastify: FastifyInstance) => {
  const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
  const clientId = process.env.KAFKA_CLIENT_ID || 'devlens-api';

  let producer: Producer;

  try {
    const kafka = new Kafka({
      clientId,
      brokers,
      retry: {
        retries: 1,
        initialRetryTime: 300,
        maxRetryTime: 3000,
      },
    });

    producer = kafka.producer({
      idempotent: true,
      maxInFlightRequests: 5,
    });
  } catch (err) {
    fastify.log.warn('Kafka client creation failed, running without Kafka');
    // Decorate with stubs
    fastify.decorate('kafka', { send: async () => {} } as any);
    fastify.decorate('sendToKafka', async () => {});
    return;
  }

  // Connect producer on ready — do NOT throw on failure
  fastify.addHook('onReady', async () => {
    try {
      await producer.connect();
      kafkaAvailable = true;
      fastify.log.info('Kafka producer connected');
    } catch (error) {
      fastify.log.warn('Kafka unavailable — running without event streaming');
    }
  });

  // Helper function to send messages to Kafka
  async function sendToKafka(
    topic: string,
    key: string,
    value: Record<string, unknown>
  ): Promise<void> {
    if (!kafkaAvailable) return;
    try {
      await producer.send({
        topic,
        messages: [
          {
            key,
            value: JSON.stringify(value),
            headers: {
              'content-type': 'application/json',
              timestamp: new Date().toISOString(),
            },
          },
        ],
      });
    } catch (error) {
      fastify.log.warn(`Failed to send to Kafka topic ${topic}`);
    }
  }

  // Decorate with a safe wrapper that won't throw
  const safeProducer = {
    send: async (...args: any[]) => {
      if (!kafkaAvailable) return;
      try {
        return await producer.send(...args);
      } catch (error) {
        fastify.log.warn('Kafka send failed');
      }
    },
  };

  fastify.decorate('kafka', safeProducer as any);
  fastify.decorate('sendToKafka', sendToKafka);

  fastify.addHook('onClose', async () => {
    if (kafkaAvailable) {
      try {
        await producer.disconnect();
        fastify.log.info('Kafka producer disconnected');
      } catch (error) {
        fastify.log.warn('Error disconnecting Kafka producer');
      }
    }
  });
});

export default kafkaPlugin;
