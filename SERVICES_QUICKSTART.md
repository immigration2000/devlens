# DevLens Services Quick Start Guide

This guide covers the newly implemented services: Code Execution Sandbox and Kafka Streams Event Router.

## Overview

Two new microservices have been added to DevLens:

1. **@devlens/sandbox** - Secure code execution for user quest submissions
2. **@devlens/stream-router** - Event routing from raw events to typed topics

## Prerequisites

```bash
# Install dependencies
pnpm install

# Ensure Docker daemon is running (for sandbox)
docker --version

# Ensure Kafka and ClickHouse are running
docker-compose -f infra/docker-compose.yml up -d
```

## Service 1: Code Execution Sandbox

### Purpose
Safely execute JavaScript code submitted by users in web game quests without risking system compromise.

### Location
`services/sandbox/`

### Start Development
```bash
cd services/sandbox
pnpm dev
```

Service runs on **http://localhost:4001**

### Quick Test
```bash
# Execute simple code
curl -X POST http://localhost:4001/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "console.log(\"Hello, DevLens!\"); Math.sqrt(16)",
    "quest_id": "quest-demo-1"
  }'

# Expected response:
# {
#   "result": {
#     "success": true,
#     "output": ["Hello, DevLens!"],
#     "errors": [],
#     "duration_ms": 145,
#     "code_snapshot_hash": "abc123...",
#     "result": "4"
#   }
# }
```

### Health Check
```bash
curl http://localhost:4001/health
# { "status": "ok", "executor": true }
```

### Key Features
- Runs code in isolated Docker containers
- 128MB memory limit
- 0.5 CPU core limit
- 50 process limit
- No network access
- 5-second timeout (configurable to 30 seconds max)
- Captures console output and errors with line numbers
- Code snapshot hashing for tracking

### API Reference

#### POST /execute
Execute user code in sandbox.

**Request:**
```json
{
  "code": "console.log('test');",
  "quest_id": "quest-123",
  "timeout_ms": 5000
}
```

**Response:**
```json
{
  "result": {
    "success": true,
    "output": ["test"],
    "errors": [],
    "duration_ms": 42,
    "result": null,
    "code_snapshot_hash": "sha256hash"
  }
}
```

**Error Responses:**
- `400`: Missing/invalid code or quest_id
- `413`: Code exceeds 50KB
- `500`: Execution failed (Docker error, timeout, etc.)

#### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "executor": true
}
```

## Service 2: Kafka Streams Event Router

### Purpose
Route raw events from a single Kafka topic to specialized typed topics and persist them to ClickHouse for analytics.

### Location
`services/stream-router/`

### Start Development
```bash
cd services/stream-router
pnpm dev
```

Service runs as a Kafka consumer (group: `stream-router-group`)

### Event Routing

Raw events are routed based on event type:

| Event Type | Input Topic | Output Topic | ClickHouse Table |
|---|---|---|---|
| `code_change` | raw-events | code-change-events | code_change_events |
| `execution` | raw-events | execution-events | execution_events |
| `test_result` | raw-events | test-result-events | test_result_events |
| `behavior` | raw-events | behavior-events | behavior_events |
| `structure_change` | raw-events | structure-events | structure_events |

### Quick Test

#### 1. Produce a test event
```bash
docker exec -it devlens-kafka kafka-console-producer.sh \
  --broker-list localhost:29092 \
  --topic raw-events
```

Then paste:
```json
{"event_type":"code_change","timestamp":"2024-04-11T10:30:00Z","quest_id":"quest-123","code":"console.log('test')"}
```

Press Ctrl+C to exit.

#### 2. Consume the routed event
```bash
docker exec -it devlens-kafka kafka-console-consumer.sh \
  --bootstrap-server localhost:29092 \
  --topic code-change-events \
  --from-beginning
```

You should see the event with added metadata (source_topic, routed_at).

#### 3. Query ClickHouse
```bash
docker exec -it devlens-clickhouse clickhouse-client \
  --database devlens \
  --query "SELECT COUNT(*) FROM code_change_events"
```

### Configuration

Environment variables (in `.env`):

```bash
KAFKA_BROKERS=localhost:29092
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_DB=devlens
CLICKHOUSE_USER=devlens
CLICKHOUSE_PASSWORD=devlens_local
LOG_LEVEL=info
```

### Monitoring

The router logs metrics every 10 seconds:

```
=== Stream Router Metrics ===
Events by type:
  code_change: 1234
  execution: 567
  test_result: 234
  behavior: 89
  structure_change: 12
  TOTAL: 2136
ClickHouse:
  Inserted: 2136
  Failed: 0
  Buffer sizes:
    code_change_events: 0
    execution_events: 5
    ...
```

### Key Features
- Consumes raw events from single topic
- Routes to 5 typed topics
- Persists to ClickHouse (batched)
- Auto-flush: 1 second or 100 events
- Retry on failure (once)
- Dead-letter queue for failed events
- Event validation
- Error handling and graceful shutdown

## Build and Deploy

### Build both services
```bash
# From project root
pnpm --filter @devlens/sandbox build
pnpm --filter @devlens/stream-router build
```

### Verify builds
```bash
ls services/sandbox/dist/
ls services/stream-router/dist/
```

### Start for production
```bash
# Terminal 1: Sandbox
cd services/sandbox
pnpm start

# Terminal 2: Stream Router
cd services/stream-router
pnpm start
```

## Docker Image for Sandbox

The sandbox service automatically builds a Docker image on startup.

### Manual build
```bash
docker build -f services/sandbox/docker/Dockerfile.runner \
  -t devlens-runner:latest \
  services/sandbox/docker/
```

### View image
```bash
docker images | grep devlens-runner
```

## Troubleshooting

### Sandbox Issues

**Port already in use:**
```bash
# Change port
SANDBOX_PORT=4002 pnpm dev
```

**Docker socket not found:**
```bash
# Verify Docker is running
docker ps
# Specify socket if in non-standard location
DOCKER_SOCKET=/path/to/docker.sock pnpm dev
```

**Image build fails:**
- Ensure Docker daemon is running
- Check disk space
- Check file permissions on docker.sock

### Stream Router Issues

**Connection refused to Kafka:**
- Verify Kafka is running: `docker ps | grep kafka`
- Check KAFKA_BROKERS setting
- Verify network connectivity

**Events not in ClickHouse:**
- Verify ClickHouse is running: `docker ps | grep clickhouse`
- Check credentials in env
- Verify tables exist

**High memory usage:**
- Reduce batch size in ClickHouse sink (default 100)
- Reduce flush interval (default 1000ms)
- Monitor for buffer accumulation

## File Structure

```
services/
├── sandbox/
│   ├── package.json
│   ├── tsconfig.json
│   ├── README.md
│   ├── docker/
│   │   ├── Dockerfile.runner
│   │   └── runner.js
│   └── src/
│       ├── index.ts (Fastify server)
│       ├── executor.ts (Docker management)
│       └── dom-mock.ts (Browser API mock)
│
└── stream-router/
    ├── package.json
    ├── tsconfig.json
    ├── README.md
    └── src/
        ├── index.ts (Main router)
        ├── router.ts (Routing logic)
        └── clickhouse-sink.ts (Batched insert)
```

## Performance Targets

### Sandbox
- Latency: 150-200ms per execution (including Docker overhead)
- Throughput: 50-100 executions/second
- Concurrency: 10 simultaneous containers
- Memory: ~100-200MB process

### Stream Router
- Latency: 100-500ms (batched to ClickHouse)
- Throughput: 1,000-5,000 events/second
- Memory: ~100-200MB (stable)
- CPU: 10-20% single-threaded

## Integration Examples

### From Web App to Sandbox
```typescript
// Submit code from quest to sandbox
const response = await fetch('http://localhost:4001/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: userCode,
    quest_id: questId,
    timeout_ms: 5000
  })
});

const { result } = await response.json();
console.log('Output:', result.output);
console.log('Errors:', result.errors);
```

### From API to Stream Router
```typescript
// Publish event to raw-events topic
const producer = kafka.producer();
await producer.send({
  topic: 'raw-events',
  messages: [{
    key: questId,
    value: JSON.stringify({
      event_type: 'code_change',
      timestamp: new Date().toISOString(),
      quest_id: questId,
      code: codeContent
    })
  }]
});
```

## Next Steps

1. **Configure .env** - Update connection strings if needed
2. **Test Sandbox** - Execute sample code to verify setup
3. **Monitor Kafka** - Watch events flow through stream router
4. **Query ClickHouse** - Verify data persistence
5. **Integrate APIs** - Connect from existing services
6. **Monitor Metrics** - Track performance and errors

## Additional Resources

- [Sandbox README](services/sandbox/README.md) - Detailed sandbox documentation
- [Stream Router README](services/stream-router/README.md) - Detailed router documentation
- [Kafka Topics Constants](packages/shared/src/constants/kafka-topics.ts) - Topic definitions

## Support

For issues or questions, refer to the detailed README files in each service directory or check the troubleshooting sections.
