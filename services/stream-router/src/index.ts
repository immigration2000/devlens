/**
 * DevLens Stream Router Service
 * Consumes raw events from Kafka and routes them to typed topics
 * Also persists events to ClickHouse for analytics
 */

import { Kafka, logLevel } from 'kafkajs';
import { ClickHouseSink } from './clickhouse-sink.js';
import { routeEvent, getRecognizedEventTypes } from './router.js';
import { KAFKA_TOPICS } from '@devlens/shared/constants';
import 'dotenv/config';

/**
 * Main router service
 */
class StreamRouter {
  private kafka: Kafka;
  private clickhouse: ClickHouseSink;
  private consumer: any;
  private producer: any;
  private eventCounts: Map<string, number> = new Map();
  private lastMetricsLog = Date.now();
  private readonly metricsIntervalMs = 10000; // Log metrics every 10s
  private running = false;

  constructor() {
    const brokers = (process.env.KAFKA_BROKERS || 'localhost:29092').split(',');

    this.kafka = new Kafka({
      clientId: 'stream-router',
      brokers,
      logLevel: process.env.LOG_LEVEL === 'debug'
        ? logLevel.DEBUG
        : logLevel.INFO,
    });

    this.consumer = this.kafka.consumer({
      groupId: 'stream-router-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxBytesPerPartition: 1024 * 1024, // 1MB
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: 5,
      idempotent: true,
      // compression: CompressionTypes.GZIP
    });

    this.clickhouse = new ClickHouseSink({
      host: process.env.CLICKHOUSE_HOST,
      port: parseInt(process.env.CLICKHOUSE_PORT || '8123', 10),
      database: process.env.CLICKHOUSE_DB,
      username: process.env.CLICKHOUSE_USER,
      password: process.env.CLICKHOUSE_PASSWORD,
      flushIntervalMs: 1000,
      batchSize: 100,
    });

    // Initialize event counters
    for (const eventType of getRecognizedEventTypes()) {
      this.eventCounts.set(eventType, 0);
    }
  }

  /**
   * Start the router service
   */
  async start(): Promise<void> {
    console.log('Starting Stream Router...');

    try {
      // Connect consumer and producer
      await this.consumer.connect();
      await this.producer.connect();
      console.log('Kafka connections established');

      // Subscribe to raw events topic
      await this.consumer.subscribe({
        topic: KAFKA_TOPICS.RAW_EVENTS,
        fromBeginning: false,
      });
      console.log(`Subscribed to ${KAFKA_TOPICS.RAW_EVENTS}`);

      // Start consuming
      this.running = true;
      await this.consumer.run({
        eachMessage: this.processMessage.bind(this),
        partitionsConsumedConcurrently: 3,
      });

      console.log('Stream Router started and consuming events');
    } catch (error) {
      console.error('Failed to start Stream Router:', error);
      throw error;
    }
  }

  /**
   * Process incoming message
   */
  private async processMessage(payload: any): Promise<void> {
    const { topic, partition, offset, key, value, timestamp } = payload;

    try {
      // Parse event JSON
      let event: Record<string, any>;
      try {
        event = JSON.parse(value.toString());
      } catch (parseError) {
        console.warn(
          `Failed to parse JSON event at offset ${offset}:`,
          parseError
        );
        return;
      }

      // Route event to appropriate topic and table
      const routed = routeEvent(event);

      if (!routed || !routed.isValid) {
        console.warn(
          `Invalid or unrecognized event type at offset ${offset}:`,
          event.event_type || event.event
        );
        return;
      }

      // Update event count
      const eventType = event.event_type || event.event;
      const currentCount = this.eventCounts.get(eventType) || 0;
      this.eventCounts.set(eventType, currentCount + 1);

      // Publish to routed topic
      try {
        await this.producer.send({
          topic: routed.topic,
          messages: [
            {
              key: event.quest_id || event.questId,
              value: value, // Re-use original serialization
              timestamp: Date.now().toString(),
              headers: {
                source_topic: KAFKA_TOPICS.RAW_EVENTS,
                routed_at: new Date().toISOString(),
              },
            },
          ],
        });
      } catch (produceError) {
        console.error(
          `Failed to produce to ${routed.topic}:`,
          produceError
        );
        // Continue processing despite produce error
      }

      // Insert into ClickHouse
      try {
        // Normalize event structure
        const normalizedEvent = {
          ...event,
          quest_id: event.quest_id || event.questId,
          event_type: eventType,
          ingested_at: new Date().toISOString(),
          kafka_offset: offset,
          kafka_partition: partition,
          kafka_timestamp: timestamp ? new Date(parseInt(timestamp)).toISOString() : new Date().toISOString(),
        };

        this.clickhouse.addEvent(routed.table, normalizedEvent);
      } catch (chError) {
        console.error(
          `Failed to add event to ClickHouse buffer for ${routed.table}:`,
          chError
        );
        // Continue processing despite ClickHouse error
      }

      // Log metrics periodically
      this.logMetricsIfNeeded();
    } catch (error) {
      console.error('Unexpected error processing message:', error);
      // Continue processing despite error
    }
  }

  /**
   * Log metrics periodically
   */
  private logMetricsIfNeeded(): void {
    const now = Date.now();
    if (now - this.lastMetricsLog >= this.metricsIntervalMs) {
      this.logMetrics();
      this.lastMetricsLog = now;
    }
  }

  /**
   * Log current metrics
   */
  private logMetrics(): void {
    console.log('=== Stream Router Metrics ===');

    // Event counts by type
    console.log('Events by type:');
    let totalEvents = 0;
    for (const [eventType, count] of this.eventCounts) {
      console.log(`  ${eventType}: ${count}`);
      totalEvents += count;
    }
    console.log(`  TOTAL: ${totalEvents}`);

    // ClickHouse metrics
    const chMetrics = this.clickhouse.getMetrics();
    console.log('ClickHouse:');
    console.log(`  Inserted: ${chMetrics.insertedCount}`);
    console.log(`  Failed: ${chMetrics.failedCount}`);
    console.log(`  Buffer sizes:`, chMetrics.bufferSizes);

    console.log('=============================');
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Stream Router...');
    this.running = false;

    try {
      // Final metrics
      this.logMetrics();

      // Disconnect consumer
      if (this.consumer) {
        await this.consumer.disconnect();
        console.log('Consumer disconnected');
      }

      // Final flush to ClickHouse
      await this.clickhouse.flush();
      console.log('ClickHouse flushed');

      // Disconnect producer
      if (this.producer) {
        await this.producer.disconnect();
        console.log('Producer disconnected');
      }

      // Close ClickHouse
      await this.clickhouse.close();
      console.log('ClickHouse closed');

      console.log('Stream Router shutdown complete');
    } catch (error) {
      console.error('Error during shutdown:', error);
      throw error;
    }
  }
}

/**
 * Main entry point
 */
async function main() {
  const router = new StreamRouter();

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down...`);
    try {
      await router.shutdown();
      process.exit(0);
    } catch (error) {
      console.error('Shutdown error:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    await router.start();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
