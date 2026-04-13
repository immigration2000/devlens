import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../../hooks/require-auth.js';

interface TestRunnerRequest {
  code: string;
  quest_id: string;
}

interface TestResult {
  test_case_id: string;
  result: 'passed' | 'failed';
  actual_output: string;
  expected_output: string;
  error?: string;
}

interface TestRunnerResponse {
  results: TestResult[];
  passed: number;
  total: number;
  duration_ms: number;
}

interface SandboxTestResponse {
  success: boolean;
  results: Array<{
    test_case_id: string;
    passed: boolean;
    actual_output: string;
    expected_output: string;
    error?: string;
  }>;
  duration_ms: number;
}

export default async function testRunnerRoutes(fastify: FastifyInstance) {

  // POST /:sessionId/test - Run test suite
  fastify.post(
    '/:sessionId/test',
    { onRequest: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { sessionId } = request.params as { sessionId: string };
      const body = request.body as TestRunnerRequest;
      const userId = request.user.id;

      if (!body.code) {
        return reply.status(400).send({ error: 'Missing code parameter' });
      }

      if (!body.quest_id) {
        return reply.status(400).send({ error: 'Missing quest_id parameter' });
      }

      try {
        // Verify session belongs to user
        const { data: session, error: sessionError } =
          await fastify.supabase
            .from('sessions')
            .select('id, quest_id')
            .eq('id', sessionId)
            .eq('user_id', userId)
            .single();

        if (sessionError || !session) {
          return reply.status(404).send({ error: 'Session not found' });
        }

        // Fetch quest test cases from database
        const { data: quest, error: questError } =
          await fastify.supabase
            .from('quests')
            .select('id, test_cases')
            .eq('id', body.quest_id)
            .single();

        if (questError || !quest) {
          return reply.status(404).send({ error: 'Quest not found' });
        }

        let testCases = [];
        if (typeof quest.test_cases === 'string') {
          testCases = JSON.parse(quest.test_cases);
        } else if (Array.isArray(quest.test_cases)) {
          testCases = quest.test_cases;
        }

        if (testCases.length === 0) {
          return reply.status(400).send({ error: 'No test cases defined for this quest' });
        }

        const startTime = Date.now();
        let testResults: TestResult[] = [];
        const sandboxUrl = process.env.SANDBOX_URL || 'http://localhost:5000';

        try {
          // Call sandbox service with test harness
          const testHarnessCode = buildTestHarness(body.code, testCases);

          const sandboxResponse = await fetch(`${sandboxUrl}/test`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code: testHarnessCode,
              quest_id: body.quest_id,
              timeout_ms: 10000,
            }),
          });

          if (sandboxResponse.ok) {
            const sandboxData = (await sandboxResponse.json()) as SandboxTestResponse;

            testResults = sandboxData.results.map((tr) => ({
              test_case_id: tr.test_case_id,
              result: tr.passed ? 'passed' : 'failed',
              actual_output: tr.actual_output,
              expected_output: tr.expected_output,
              error: tr.error,
            }));

            fastify.log.debug(`Tests executed in sandbox for session ${sessionId}`);
          }
        } catch (sandboxError) {
          fastify.log.error(sandboxError, 'Failed to execute tests in sandbox');
          return reply.status(500).send({
            error: 'Failed to execute tests',
            details: String(sandboxError),
          });
        }

        const duration = Date.now() - startTime;
        const passedCount = testResults.filter((r) => r.result === 'passed').length;

        // Increment metrics
        if (fastify.metrics) {
          fastify.metrics.incrementEvents(testResults.length);
          fastify.metrics.incrementProcessed(passedCount);
        }

        // Create test result events for each test case
        const testResultEvents = testResults.map((tr) => ({
          session_id: sessionId,
          user_id: userId,
          quest_id: body.quest_id,
          test_case_id: tr.test_case_id,
          result: tr.result,
          actual_output: tr.actual_output,
          expected_output: tr.expected_output,
          error: tr.error,
          timestamp: new Date().toISOString(),
          seq: Math.floor(Date.now() / 1000),
        }));

        // Send test result events to Kafka
        try {
          await fastify.kafka.send({
            topic: 'test-result-events',
            messages: testResultEvents.map((event) => ({
              key: sessionId,
              value: JSON.stringify(event),
              headers: {
                'content-type': 'application/json',
                timestamp: new Date().toISOString(),
              },
            })),
          });
          fastify.log.debug(`Test result events sent to Kafka for session ${sessionId}`);
        } catch (kafkaError) {
          fastify.log.error(kafkaError, 'Failed to send test result events to Kafka');
        }

        // Insert into ClickHouse
        try {
          await fastify.clickhouse.insertEvents('test_result_events', testResultEvents);
        } catch (chError) {
          fastify.log.warn(
            chError,
            'Failed to insert test result events into ClickHouse'
          );
        }

        const response: TestRunnerResponse = {
          results: testResults,
          passed: passedCount,
          total: testResults.length,
          duration_ms: duration,
        };

        return reply.status(200).send(response);
      } catch (error) {
        fastify.log.error(error, 'Error running tests');
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}

/**
 * Build test harness code that wraps user code and runs test cases
 */
function buildTestHarness(
  userCode: string,
  testCases: Array<{
    id: string;
    input?: unknown;
    expected_output: string;
  }>
): string {
  return `
// User code
${userCode}

// Test harness
const __testResults = [];
const __testCases = ${JSON.stringify(testCases)};

for (const testCase of __testCases) {
  try {
    let actualOutput;
    let passed = false;
    let error = undefined;

    try {
      // Execute test case with input if provided
      if (testCase.input !== undefined) {
        actualOutput = solve(testCase.input);
      } else {
        actualOutput = solve();
      }

      // Compare output
      const expectedStr = String(testCase.expected_output).trim();
      const actualStr = String(actualOutput).trim();
      passed = expectedStr === actualStr;

      if (!passed) {
        error = \`Expected "\${expectedStr}" but got "\${actualStr}"\`;
      }
    } catch (execError) {
      error = String(execError);
      passed = false;
    }

    __testResults.push({
      test_case_id: testCase.id,
      passed,
      actual_output: String(actualOutput || ''),
      expected_output: String(testCase.expected_output),
      error,
    });
  } catch (e) {
    __testResults.push({
      test_case_id: testCase.id,
      passed: false,
      actual_output: '',
      expected_output: String(testCase.expected_output),
      error: String(e),
    });
  }
}

// Return results
__testResults;
`;
}
