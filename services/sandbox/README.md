# DevLens Code Execution Sandbox

Secure, isolated execution environment for user-submitted code from web game quests.

## Overview

The sandbox service provides secure execution of JavaScript code in isolated Docker containers with strict resource limits. This enables DevLens to safely run untrusted code submitted by users without risking system compromise.

## Architecture

### Components

1. **Fastify Server** (port 4001)
   - REST API for code execution
   - Health checks
   - Request validation and routing

2. **CodeExecutor** (executor.ts)
   - Docker container management
   - Resource limit enforcement
   - Concurrent execution tracking (max 10 containers)
   - Container lifecycle management

3. **Docker Runner** (runner.js)
   - Executes inside sandbox container
   - Wraps user code with DOM mock
   - Enforces 5-second timeout
   - Captures output and errors
   - Returns JSON results

4. **DOM Mock** (dom-mock.ts)
   - Minimal browser API simulation
   - document, window, canvas APIs
   - console capture
   - No actual I/O or network access

## API

### POST /execute

Execute user code in sandbox.

**Request:**
```json
{
  "code": "console.log('Hello'); document.getElementById('output').textContent = 'Done';",
  "quest_id": "quest-123",
  "timeout_ms": 5000
}
```

**Parameters:**
- `code` (string, required): JavaScript code to execute
- `quest_id` (string, required): Associated quest ID for tracking
- `timeout_ms` (number, optional): Execution timeout (default 5000, max 30000)

**Response:**
```json
{
  "result": {
    "success": true,
    "output": ["Hello"],
    "errors": [],
    "duration_ms": 42,
    "code_snapshot_hash": "abc123...",
    "result": null
  }
}
```

**Response Fields:**
- `success` (boolean): Whether execution completed without errors
- `output` (string[]): Array of console.log outputs
- `errors` (array): Array of error objects with message, type, and line number
- `duration_ms` (number): Execution time in milliseconds
- `result` (string|null): Final expression result
- `code_snapshot_hash` (string): SHA256 hash of submitted code

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "executor": true
}
```

## Security Features

### Isolation
- Each execution runs in a separate Docker container
- Container-level process isolation
- No inter-container communication

### Resource Limits
- Memory: 128MB max
- CPU: 0.5 core max
- Process limit: 50 PIDs max
- Network: Completely disabled
- Filesystem: Non-root user (sandbox:sandbox)
- Read-only root filesystem (where possible)

### Execution Constraints
- Timeout: 5 seconds default, 30 seconds max
- Code size: 50KB max
- No access to: filesystem, network, system calls

### Code Safety
- VM context isolation (vm.runInNewContext)
- No WebAssembly or code generation
- DOM/window APIs are mocked stubs
- setTimeout/setInterval limited to 5 seconds

## Docker Image

### Build
```bash
docker build -f services/sandbox/docker/Dockerfile.runner \
  -t devlens-runner:latest \
  services/sandbox/docker/
```

### Image Details
- Base: node:20-alpine (~150MB)
- Non-root user: sandbox:sandbox (UID 1001)
- Entry: node runner.js
- No network interface
- Resource quotas applied at runtime

## Development

### Local Setup
```bash
pnpm install
pnpm dev
```

Runs on http://localhost:4001

### Testing Sandbox Execution
```bash
curl -X POST http://localhost:4001/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "console.log(Math.sqrt(16)); process.memoryUsage()",
    "quest_id": "test-1"
  }'
```

### Monitoring
- Check `/health` endpoint for status
- View Fastify logs for request details
- Docker logs: `docker logs devlens-sandbox-<id>`

## Implementation Details

### Runner Script (runner.js)

Executed inside each sandbox container:

1. Reads user code from `/sandbox/code.js`
2. Sets up DOM mock (document, window, canvas)
3. Wraps code in try-catch
4. Executes with vm.runInNewContext (5-second timeout)
5. Captures console.log output
6. Captures error details (message, type, line number)
7. Checks memory usage (fails if > 128MB)
8. Outputs JSON result to stdout

### Execution Flow

```
User Request (POST /execute)
    ↓
Validate Input (code, quest_id, size)
    ↓
Acquire Semaphore (max 10 concurrent)
    ↓
Create Temp Directory
    ↓
Write Code to File
    ↓
Create Docker Container
    ↓
Mount Code (read-only)
    ↓
Apply Resource Limits
    ↓
Start Container & Wait
    ↓
Parse JSON Result
    ↓
Cleanup (remove container, temp files)
    ↓
Release Semaphore
    ↓
Return Result to Client
```

## Environment Variables

```
SANDBOX_PORT=4001                          # Server port
SANDBOX_HOST=0.0.0.0                       # Server host
DOCKER_SOCKET=/var/run/docker.sock         # Docker daemon socket
LOG_LEVEL=info                             # Logging level
NODE_ENV=development                       # Environment
```

## Error Handling

### Execution Errors
- Syntax errors: Captured with line number
- Runtime errors: Caught with type information
- Memory limit exceeded: Specific error message
- Timeout: Error with timeout duration

### Container Errors
- Build failures: Logged, service exits with error
- Docker unavailable: Health check fails
- Container creation failures: Returned as error response

### Cleanup
- Auto-remove containers on completion
- Cleanup on timeout (force kill)
- Semaphore released even on errors
- Temp files always deleted

## Performance Considerations

### Concurrency
- Semaphore limits to 10 concurrent executions
- Each execution ~100-200ms (including Docker overhead)
- Throughput: ~50-100 executions/second

### Docker Overhead
- Container startup: ~50-100ms
- Code execution: 1-50ms (typical)
- Container cleanup: ~20-50ms
- Total: ~150-200ms per execution

### Optimization Strategies
- Pre-warm container pool (optional future enhancement)
- Batch multiple executions
- Cache Docker image aggressively
- Monitor container startup times

## Troubleshooting

### Image Build Fails
- Ensure Docker daemon is running
- Check disk space for image
- Verify Dockerfile.runner syntax
- Check permissions on docker.sock

### Executions Timeout
- Check container resource usage
- Increase timeout if legitimate
- Monitor for infinite loops
- Check memory pressure on host

### High Memory Usage
- Limit concurrent executions
- Check for memory leaks in DOM mock
- Monitor container memory in Docker
- Consider reducing batch size

### Docker Socket Issues
- Verify DOCKER_SOCKET path
- Check file permissions
- Ensure Docker daemon is accessible
- Run with appropriate Docker permissions

## Future Enhancements

1. **Container Pool**: Pre-warm containers for faster startup
2. **Metrics**: Prometheus integration for execution metrics
3. **Caching**: Cache compiled code patterns
4. **Plugins**: Support code modules and libraries
5. **Sandboxing**: Further restrict with seccomp/AppArmor
6. **Monitoring**: Integration with observability platform
