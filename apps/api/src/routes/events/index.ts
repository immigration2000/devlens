import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eventBatchSchema } from '@devlens/shared';
import { KAFKA_TOPICS } from '@devlens/shared';

export default async function eventsRoutes(fastify: FastifyInstance) {
  // POST /batch - Send batch of events to Kafka and ClickHouse
  fastify.post('/batch', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate request body
      const validationResult = eventBatchSchema.safeParse(request.body);
      if (!validationResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: validationResult.error.errors,
        });
      }

      const batch = validationResult.data;
      const { session_id, events } = batch;

      // Send all events to raw-events topic
      const rawEventMessages = events.map((event) => ({
        key: session_id,
        value: JSON.stringify(event),
        headers: {
          'content-type': 'application/json',
          timestamp: new Date().toISOString(),
        },
      }));

      // Send to type-specific topics
      const typeSpecificMessages: Record<string, Array<{ key: string; value: string; headers?: Record<string, string> }>> = {};

      for (const event of events) {
        let topic: string | undefined;

        switch (event.event) {
          case 'code_change':
            topic = KAFKA_TOPICS.CODE_CHANGE_EVENTS;
            break;
          case 'execution':
            topic = KAFKA_TOPICS.EXECUTION_EVENTS;
            break;
          case 'test_result':
            topic = KAFKA_TOPICS.TEST_RESULT_EVENTS;
            break;
          case 'behavior':
            topic = KAFKA_TOPICS.BEHAVIOR_EVENTS;
            break;
          case 'structure_change':
            topic = KAFKA_TOPICS.STRUCTURE_EVENTS;
            break;
        }

        if (topic) {
          if (!typeSpecificMessages[topic]) {
            typeSpecificMessages[topic] = [];
          }
          typeSpecificMessages[topic].push({
            key: session_id,
            value: JSON.stringify(event),
            headers: {
              'content-type': 'application/json',
              timestamp: new Date().toISOString(),
            },
          });
        }
      }

      // Send to Kafka in parallel (fire-and-forget for all topics)
      const kafkaPromises = [
        fastify.kafka.send({ topic: KAFKA_TOPICS.RAW_EVENTS, messages: rawEventMessages }).catch(() => {}),
        ...Object.entries(typeSpecificMessages)
          .filter(([, msgs]) => msgs.length > 0)
          .map(([topic, messages]) =>
            fastify.kafka.send({ topic, messages }).catch(() => {})
          ),
      ];
      Promise.allSettled(kafkaPromises).catch(() => {});

      // Insert events into ClickHouse
      try {
        const chEvents = events.map((event) => ({
          session_id,
          event_type: event.event,
          timestamp: new Date(event.timestamp).getTime(),
          user_id: event.user_id,
          quest_id: event.quest_id,
          seq: event.seq,
          data: JSON.stringify(event),
        }));

        await fastify.clickhouse.insertEvents('events_raw', chEvents);
        fastify.log.debug(
          `Inserted ${events.length} events into ClickHouse for session ${session_id}`
        );
      } catch (chError) {
        fastify.log.error(chError, 'Failed to insert events into ClickHouse');
        // Log but don't fail the request - Kafka is primary store
      }

      // Update session event count in Redis
      try {
        const counterKey = `session:${session_id}:event_count`;
        await fastify.redis.incrby(counterKey, events.length);
        // Set TTL to 30 days
        await fastify.redis.expire(counterKey, 30 * 24 * 60 * 60);

        const healthScoreKey = `session:${session_id}:health_score`;
        const ttl = await fastify.redis.ttl(healthScoreKey);
        if (ttl === -1) {
          // If key exists but has no expiry, set it
          await fastify.redis.expire(healthScoreKey, 30 * 24 * 60 * 60);
        }
      } catch (redisError) {
        fastify.log.warn(
          redisError,
          'Failed to update session counter in Redis'
        );
      }

      return reply.status(202).send({
        received: events.length,
        session_id,
        message: 'Events queued for processing',
      });
    } catch (error) {
      fastify.log.error(error, 'Error processing event batch');
      return reply.status(500).send({
        error: 'Failed to process events',
      });
    }
  });
}
