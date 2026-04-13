import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import vm from 'node:vm';
import { sessionStore } from '../../services/session-store.js';
import { analyzeCode } from '../../services/code-analyzer.js';
import { requireAuth } from '../../hooks/require-auth.js';

interface ExecutionRequest {
  code: string;
  quest_id?: string;
}

interface SandboxResponse {
  success: boolean;
  output: string;
  error?: string;
  error_type?: string;
  duration_ms: number;
}

export default async function executionRoutes(fastify: FastifyInstance) {

  // POST /:sessionId/run - Execute code
  fastify.post(
    '/:sessionId/run',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { sessionId } = request.params as { sessionId: string };
      const body = request.body as ExecutionRequest;
      const userId = (request as any).user.id;

      if (!body.code) {
        return reply.status(400).send({ error: 'Missing code parameter' });
      }

      // Get quest_id from session if not provided
      let questId = body.quest_id || 'unknown';
      if (questId === 'unknown') {
        const memSession = sessionStore.get(sessionId);
        if (memSession) questId = memSession.quest_id;
      }

      try {
        const codeHash = crypto
          .createHash('sha256')
          .update(body.code)
          .digest('hex');

        let result: 'success' | 'syntax_error' | 'runtime_error' = 'success';
        let errorType: string | undefined;
        let errorMessage: string | undefined;
        let output = '';
        const startTime = Date.now();

        // Try sandbox service in production
        const sandboxUrl = process.env.SANDBOX_URL || 'http://localhost:4001';
        let usedSandbox = false;

        if (process.env.NODE_ENV === 'production') {
          try {
            const sandboxResponse = await fetch(`${sandboxUrl}/execute`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                code: body.code,
                quest_id: questId,
                timeout_ms: 5000,
              }),
            });

            if (sandboxResponse.ok) {
              const sandboxData = (await sandboxResponse.json()) as SandboxResponse;
              output = sandboxData.output;
              result = sandboxData.success
                ? 'success'
                : sandboxData.error_type === 'SyntaxError'
                  ? 'syntax_error'
                  : 'runtime_error';
              if (sandboxData.error) {
                errorType = sandboxData.error_type;
                errorMessage = sandboxData.error;
              }
              usedSandbox = true;
            }
          } catch (sandboxError) {
            fastify.log.warn('Sandbox service unavailable, falling back to vm');
          }
        }

        // Fallback to Node.js vm module
        if (!usedSandbox) {
          try {
            const logs: string[] = [];
            const context = vm.createContext({
              console: {
                log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
                error: (...args: unknown[]) => logs.push('[error] ' + args.map(String).join(' ')),
                warn: (...args: unknown[]) => logs.push('[warn] ' + args.map(String).join(' ')),
                info: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
              },
              setTimeout: () => {},
              clearTimeout: () => {},
              setInterval: () => {},
              clearInterval: () => {},
            });

            const script = new vm.Script(body.code, { filename: '<user-code>' });
            script.runInContext(context, { timeout: 5000 });

            output = logs.join('\n');
          } catch (execError: unknown) {
            if (execError instanceof SyntaxError) {
              result = 'syntax_error';
              errorType = 'SyntaxError';
              errorMessage = (execError as Error).message;
            } else if (
              execError instanceof Error &&
              execError.message.includes('timed out')
            ) {
              result = 'runtime_error';
              errorType = 'TimeoutError';
              errorMessage = 'Code execution exceeded 5 second timeout';
            } else {
              result = 'runtime_error';
              errorType = (execError as Error)?.constructor?.name || 'Error';
              errorMessage = (execError as Error)?.message || 'Unknown error';
            }
          }
        }

        const duration = Date.now() - startTime;

        // Non-critical: send to Kafka and ClickHouse
        const executionEvent = {
          session_id: sessionId,
          user_id: userId,
          quest_id: questId,
          code_snapshot_hash: codeHash,
          result,
          error_type: errorType,
          error_message: errorMessage,
          duration_ms: duration,
          output,
          timestamp: new Date().toISOString(),
          seq: Math.floor(Date.now() / 1000),
        };

        // Fire-and-forget: Kafka + ClickHouse writes in parallel (don't block response)
        Promise.allSettled([
          fastify.kafka.send({
            topic: 'execution-events',
            messages: [{ key: sessionId, value: JSON.stringify(executionEvent) }],
          }).catch(() => {}),
          fastify.clickhouse.insertEvents('execution_events', [executionEvent]).catch(() => {}),
        ]);

        const analysis = analyzeCode(body.code);

        return reply.status(200).send({
          success: result === 'success',
          result,
          output,
          error: errorMessage,
          duration_ms: duration,
          snapshot_hash: codeHash,
          analysis,
        });
      } catch (error) {
        fastify.log.error(error, 'Error executing code');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
