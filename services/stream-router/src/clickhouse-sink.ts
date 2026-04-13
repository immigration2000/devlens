/**
 * Batched ClickHouse event sink
 * Accumulates events and batch inserts them
 */

import { createClient, ClickHouseClient } from '@clickhouse/client';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export interface ClickHouseSinkOptions {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  flushIntervalMs?: number;
  batchSize?: number;
  deadLetterDir?: string;
}

/**
 * Batched ClickHouse event sink
 */
export class ClickHouseSink {
  private client: ClickHouseClient;
  private buffers: Map<string, Record<string, any>[]> = new Map();
  private insertedCount = 0;
  private failedCount = 0;
  private flushTimer: NodeJS.Timer | null = null;
  private readonly flushIntervalMs: number;
  private readonly batchSize: number;
  private readonly deadLetterDir: string;
  private readonly host: string;
  private readonly port: number;
  private readonly database: string;
  private readonly username: string;
  private readonly password: string;

  constructor(options: ClickHouseSinkOptions = {}) {
    this.host = options.host || process.env.CLICKHOUSE_HOST || 'localhost';
    this.port = options.port || parseInt(process.env.CLICKHOUSE_PORT || '8123', 10);
    this.database = options.database || process.env.CLICKHOUSE_DB || 'devlens';
    this.username = options.username || process.env.CLICKHOUSE_USER || 'devlens';
    this.password =
      options.password || process.env.CLICKHOUSE_PASSWORD || 'devlens_local';
    this.flushIntervalMs = options.flushIntervalMs || 1000;
    this.batchSize = options.batchSize || 100;
    this.deadLetterDir =
      options.deadLetterDir || path.join(os.tmpdir(), 'devlens-dlq');

    this.client = createClient({
      host: `http://${this.host}:${this.port}`,
      database: this.database,
      username: this.username,
      password: this.password,
    });

    this.startAutoFlush();
  }

  /**
   * Add event to buffer
   */
  addEvent(table: string, event: Record<string, any>): void {
    if (!this.buffers.has(table)) {
      this.buffers.set(table, []);
    }

    const buffer = this.buffers.get(table)!;
    buffer.push(event);

    // Auto-flush if buffer reaches batch size
    if (buffer.length >= this.batchSize) {
      this.flush().catch(err => {
        console.error(`Failed to flush buffer for table ${table}:`, err);
      });
    }
  }

  /**
   * Flush all buffers to ClickHouse
   */
  async flush(): Promise<void> {
    const tables = Array.from(this.buffers.keys());

    for (const table of tables) {
      const buffer = this.buffers.get(table);
      if (!buffer || buffer.length === 0) continue;

      const events = buffer.splice(0, buffer.length);

      try {
        await this.insertEvents(table, events);
        this.insertedCount += events.length;
      } catch (error) {
        this.failedCount += events.length;
        console.error(`Failed to insert ${events.length} events into ${table}:`, error);

        // Write to dead-letter queue
        await this.writeDeadLetter(table, events, error);

        // Retry once
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          await this.insertEvents(table, events);
          this.insertedCount += events.length;
          this.failedCount -= events.length;
        } catch (retryError) {
          console.error(`Retry failed for ${table}:`, retryError);
          await this.writeDeadLetter(table, events, retryError);
        }
      }
    }
  }

  /**
   * Insert events into ClickHouse
   */
  private async insertEvents(
    table: string,
    events: Record<string, any>[]
  ): Promise<void> {
    if (events.length === 0) return;

    try {
      await this.client.insert({
        table,
        values: events,
        format: 'JSONEachRow',
      });
    } catch (error) {
      console.error(`ClickHouse insert failed for ${table}:`, error);
      throw error;
    }
  }

  /**
   * Write failed events to dead-letter queue
   */
  private async writeDeadLetter(
    table: string,
    events: Record<string, any>[],
    error: unknown
  ): Promise<void> {
    try {
      // Ensure directory exists
      await fs.mkdir(this.deadLetterDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${table}-${timestamp}.jsonl`;
      const filepath = path.join(this.deadLetterDir, filename);

      const lines = events
        .map(e => JSON.stringify({ event: e, error: String(error) }))
        .join('\n');

      await fs.appendFile(filepath, lines + '\n', 'utf-8');
      console.log(`Wrote ${events.length} failed events to ${filepath}`);
    } catch (dlqError) {
      console.error('Failed to write to dead-letter queue:', dlqError);
    }
  }

  /**
   * Start auto-flush timer
   */
  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(err => {
        console.error('Auto-flush failed:', err);
      });
    }, this.flushIntervalMs);

    // Ensure timer doesn't prevent process exit
    if (this.flushTimer.unref) {
      this.flushTimer.unref();
    }
  }

  /**
   * Get metrics
   */
  getMetrics(): {
    insertedCount: number;
    failedCount: number;
    bufferSizes: Record<string, number>;
  } {
    const bufferSizes: Record<string, number> = {};
    for (const [table, events] of this.buffers) {
      bufferSizes[table] = events.length;
    }

    return {
      insertedCount: this.insertedCount,
      failedCount: this.failedCount,
      bufferSizes,
    };
  }

  /**
   * Close sink and flush remaining events
   */
  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer as any);
    }

    // Final flush
    await this.flush();

    // Close client
    try {
      await this.client.close();
    } catch (error) {
      console.error('Error closing ClickHouse client:', error);
    }
  }
}

export default ClickHouseSink;
