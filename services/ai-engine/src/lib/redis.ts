import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`;

// Main Redis client for commands
export const redis = new Redis(redisUrl);

// Separate pub/sub client (cannot use same connection for pub/sub and regular commands)
export const pubsubClient = new Redis(redisUrl);

/**
 * Publish analysis results via Redis pub/sub
 * Channel format: analysis:<module>:<sessionId>
 * This aligns with the WebSocket server's psubscribe pattern 'analysis:*'
 */
export async function publishAnalysis(
  sessionId: string,
  result: { type: string; [key: string]: any }
): Promise<void> {
  try {
    const channel = `analysis:${result.type}:${sessionId}`;
    await pubsubClient.publish(channel, JSON.stringify(result));
    console.log(`[${new Date().toISOString()}] Published analysis result to ${channel}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error publishing analysis:`, error);
  }
}

/**
 * Publish health score update
 * Channel format: health-score:<sessionId>
 */
export async function publishHealthScore(sessionId: string, score: any): Promise<void> {
  try {
    const channel = `health-score:${sessionId}`;
    await pubsubClient.publish(channel, JSON.stringify(score));
    console.log(`[${new Date().toISOString()}] Published health score to ${channel}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error publishing health score:`, error);
  }
}

/**
 * Publish event count update
 * Channel format: event-count:<sessionId>
 */
export async function publishEventCount(sessionId: string, count: any): Promise<void> {
  try {
    const channel = `event-count:${sessionId}`;
    await pubsubClient.publish(channel, JSON.stringify(count));
    console.log(`[${new Date().toISOString()}] Published event count to ${channel}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error publishing event count:`, error);
  }
}

// Helper function to publish risk warnings
export async function publishRiskWarning(sessionId: string, warning: any): Promise<void> {
  try {
    const channel = `analysis:risk:${sessionId}`;
    await pubsubClient.publish(channel, JSON.stringify({ type: 'risk', ...warning }));
    console.log(`[${new Date().toISOString()}] Published risk warning to ${channel}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error publishing risk warning:`, error);
  }
}

// Handle connection events
redis.on('connect', () => {
  console.log(`[${new Date().toISOString()}] Redis connected`);
});

redis.on('error', (error) => {
  console.error(`[${new Date().toISOString()}] Redis connection error:`, error);
});

pubsubClient.on('connect', () => {
  console.log(`[${new Date().toISOString()}] Redis pubsub client connected`);
});

pubsubClient.on('error', (error) => {
  console.error(`[${new Date().toISOString()}] Redis pubsub client error:`, error);
});

export async function disconnectRedis(): Promise<void> {
  try {
    await redis.quit();
    await pubsubClient.quit();
    console.log(`[${new Date().toISOString()}] Redis connections closed`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error closing Redis connections:`, error);
  }
}
