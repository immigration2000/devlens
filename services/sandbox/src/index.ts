/**
 * DevLens Code Execution Sandbox Service
 * Provides secure execution of user code in isolated Docker containers
 */

import Fastify from 'fastify';
import { CodeExecutor, ExecutionOptions, ExecutionResult } from './executor.js';
import { createHash } from 'crypto';
import 'dotenv/config';

const PORT = parseInt(process.env.SANDBOX_PORT || '4001', 10);
const HOST = process.env.SANDBOX_HOST || '0.0.0.0';

let executor: CodeExecutor | null = null;

/**
 * Start the Fastify server
 */
async function main() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      prettyPrint: process.env.NODE_ENV !== 'production',
    },
  });

  // Initialize executor
  try {
    executor = new CodeExecutor();
    await executor.initialize();
    console.log('CodeExecutor initialized successfully');
  } catch (error) {
    console.error('Failed to initialize CodeExecutor:', error);
    process.exit(1);
  }

  // Health check endpoint
  fastify.get<{ Reply: { status: string; executor: boolean } }>(
    '/health',
    async (request, reply) => {
      const executorHealthy = executor
        ? await executor.healthCheck()
        : false;
      return {
        status: executorHealthy ? 'ok' : 'degraded',
        executor: executorHealthy,
      };
    }
  );

  // Execute code endpoint
  fastify.post<{
    Body: {
      code: string;
      quest_id: string;
      timeout_ms?: number;
    };
    Reply: {
      result: ExecutionResult & {
        code_snapshot_hash: string;
      };
    };
  }>('/execute', async (request, reply) => {
    const { code, quest_id, timeout_ms } = request.body;

    // Validate input
    if (!code || typeof code !== 'string') {
      return reply.status(400).send({
        error: 'Missing or invalid "code" field',
      });
    }

    if (!quest_id || typeof quest_id !== 'string') {
      return reply.status(400).send({
        error: 'Missing or invalid "quest_id" field',
      });
    }

    if (code.length > 50000) {
      return reply.status(413).send({
        error: 'Code exceeds maximum size (50KB)',
      });
    }

    try {
      // Execute code
      const executionResult = await executor!.execute({
        code,
        questId: quest_id,
        timeoutMs: timeout_ms,
      });

      // Generate code snapshot hash
      const codeHash = createHash('sha256').update(code).digest('hex');

      return reply.status(200).send({
        result: {
          ...executionResult,
          code_snapshot_hash: codeHash,
        },
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, starting graceful shutdown...`);

    try {
      if (executor) {
        console.log('Cleaning up sandbox containers...');
        await executor.cleanup();
      }

      await fastify.close();
      console.log('Server closed gracefully');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`Sandbox service listening on ${HOST}:${PORT}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
