import dotenv from 'dotenv';
import { Kafka } from 'kafkajs';
import { Worker } from 'bullmq';
import { redis, pubsubClient, disconnectRedis } from './lib/redis';
import { initClickhouse, disconnectClickhouse } from './lib/clickhouse';
import { eventRouter } from './consumers/event-router';
import { processCodeQualityJob } from './queue/worker';
import type { CodeAnalysisJobData } from './queue/worker';

dotenv.config();

const kafka = new Kafka({
  clientId: 'ai-engine',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

const consumer = kafka.consumer({ groupId: 'ai-engine-group' });

let isRunning = false;

async function startConsumer() {
  try {
    await consumer.connect();
    console.log(`[${new Date().toISOString()}] Kafka consumer connected`);

    await consumer.subscribe({ topic: 'raw-events' });
    console.log(`[${new Date().toISOString()}] Subscribed to topic: raw-events`);

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value?.toString() || '{}');
          console.log(
            `[${new Date().toISOString()}] Received event: ${event.type} (session: ${event.sessionId})`
          );
          await eventRouter(event);
        } catch (error) {
          console.error(
            `[${new Date().toISOString()}] Error processing Kafka message:`,
            error
          );
        }
      },
    });
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Failed to start Kafka consumer:`,
      error
    );
    throw error;
  }
}

async function startWorker() {
  try {
    const worker = new Worker<CodeAnalysisJobData>(
      'code-analysis',
      async (job) => {
        return await processCodeQualityJob(job);
      },
      {
        connection: redis,
        concurrency: parseInt(process.env.WORKER_CONCURRENCY || '3'),
      }
    );

    worker.on('completed', (job) => {
      console.log(
        `[${new Date().toISOString()}] Job ${job.id} completed successfully`
      );
    });

    worker.on('failed', (job, err) => {
      console.error(
        `[${new Date().toISOString()}] Job ${job?.id} failed:`,
        err
      );
    });

    console.log(
      `[${new Date().toISOString()}] BullMQ worker started (concurrency: ${
        process.env.WORKER_CONCURRENCY || '3'
      })`
    );

    return worker;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to start BullMQ worker:`, error);
    throw error;
  }
}

async function gracefulShutdown() {
  if (!isRunning) return;

  isRunning = false;
  console.log(
    `[${new Date().toISOString()}] Starting graceful shutdown...`
  );

  try {
    await consumer.disconnect();
    console.log(
      `[${new Date().toISOString()}] Kafka consumer disconnected`
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error disconnecting Kafka consumer:`,
      error
    );
  }

  try {
    await disconnectRedis();
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error disconnecting Redis:`,
      error
    );
  }

  try {
    await disconnectClickhouse();
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error disconnecting ClickHouse:`,
      error
    );
  }

  console.log(
    `[${new Date().toISOString()}] Graceful shutdown completed`
  );
  process.exit(0);
}

async function main() {
  try {
    console.log(`[${new Date().toISOString()}] Starting AI Engine...`);

    // Initialize ClickHouse
    await initClickhouse();

    // Start Kafka consumer
    await startConsumer();

    // Start BullMQ worker
    await startWorker();

    isRunning = true;
    console.log(`[${new Date().toISOString()}] AI Engine running`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to start AI Engine:`, error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(
    `[${new Date().toISOString()}] Uncaught exception:`,
    error
  );
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(
    `[${new Date().toISOString()}] Unhandled rejection at`,
    promise,
    'reason:',
    reason
  );
});

main();
