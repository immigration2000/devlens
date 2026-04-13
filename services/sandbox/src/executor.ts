/**
 * Docker-based code executor
 * Manages secure, isolated execution of user code
 */

import Docker from 'dockerode';
import { v4 as uuid } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export interface ExecutionOptions {
  code: string;
  questId: string;
  timeoutMs?: number;
}

export interface ExecutionResult {
  success: boolean;
  output: string[];
  errors: Array<{
    message: string;
    type: string;
    line: number;
    column?: number;
  }>;
  duration_ms: number;
  result?: string;
}

/**
 * Semaphore for limiting concurrent executions
 */
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise(resolve => {
      this.waitQueue.push(() => {
        this.permits--;
        resolve();
      });
    });
  }

  release(): void {
    const next = this.waitQueue.shift();
    if (next) {
      this.permits++;
      next();
    } else {
      this.permits++;
    }
  }
}

/**
 * CodeExecutor - Manages Docker-based code execution
 */
export class CodeExecutor {
  private docker: Docker;
  private semaphore: Semaphore;
  private readonly maxConcurrent = 10;
  private readonly executorImage = 'devlens-runner:latest';
  private imageBuilt = false;

  constructor() {
    this.docker = new Docker({
      socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
    });
    this.semaphore = new Semaphore(this.maxConcurrent);
  }

  /**
   * Initialize executor - build Docker image if needed
   */
  async initialize(): Promise<void> {
    try {
      // Check if image exists
      const images = await this.docker.listImages({
        filters: { reference: [this.executorImage] },
      });

      if (images.length === 0) {
        console.log(`Building Docker image: ${this.executorImage}`);
        await this.buildImage();
      }
      this.imageBuilt = true;
    } catch (error) {
      console.error('Failed to initialize executor:', error);
      throw error;
    }
  }

  /**
   * Build Docker image from Dockerfile.runner
   */
  private async buildImage(): Promise<void> {
    const dockerfilePath = path.join(
      process.cwd(),
      'docker',
      'Dockerfile.runner'
    );
    const runnerPath = path.join(process.cwd(), 'docker', 'runner.js');

    try {
      const dockerfile = await fs.readFile(dockerfilePath, 'utf-8');
      const runner = await fs.readFile(runnerPath, 'utf-8');

      // Create temporary directory with Dockerfile and runner
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devlens-'));

      await fs.writeFile(
        path.join(tmpDir, 'Dockerfile'),
        dockerfile
      );
      await fs.writeFile(path.join(tmpDir, 'runner.js'), runner);

      // Build image
      const stream = await this.docker.buildImage(
        {
          context: tmpDir,
          src: ['Dockerfile', 'runner.js'],
        },
        { t: this.executorImage }
      );

      await new Promise<void>((resolve, reject) => {
        this.docker.modem.followProgress(
          stream,
          (err: any) => {
            if (err) reject(err);
            else resolve();
          },
          (output: any) => {
            console.log(output.stream?.trim() || '');
          }
        );
      });

      // Cleanup
      await fs.rm(tmpDir, { recursive: true });
      console.log(`Successfully built image: ${this.executorImage}`);
    } catch (error) {
      console.error('Failed to build Docker image:', error);
      throw error;
    }
  }

  /**
   * Execute code in isolated Docker container
   */
  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    await this.semaphore.acquire();

    try {
      const containerName = `devlens-sandbox-${uuid().replace(/-/g, '').slice(0, 12)}`;
      const timeoutMs = Math.min(options.timeoutMs || 5000, 30000);

      // Create temp file for code
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devlens-'));
      const codeFile = path.join(tmpDir, 'code.js');
      await fs.writeFile(codeFile, options.code);

      let container: Docker.Container | null = null;
      let result: ExecutionResult | null = null;

      try {
        // Create container
        container = await this.docker.createContainer({
          Image: this.executorImage,
          name: containerName,
          Hostname: 'sandbox',
          User: 'sandbox:sandbox',

          // Security constraints
          SecurityOpt: [
            'no-new-privileges=true',
            'apparmor=docker-default',
          ],
          CapDrop: ['ALL'],
          CapAdd: [],
          ReadonlyRootfs: false, // Allow writes to /sandbox
          Tmpfs: {
            '/tmp': 'size=32m,noexec,nosuid,nodev',
            '/run': 'size=4m,noexec,nosuid,nodev',
          },

          // Resource limits
          Memory: 128 * 1024 * 1024, // 128MB
          MemorySwap: 128 * 1024 * 1024, // No swap
          CPUQuota: 50000, // 0.5 CPU
          CPUPeriod: 100000,
          PidsLimit: 50,

          // Network isolation
          NetworkMode: 'none',

          // Mounts
          Binds: [`${codeFile}:/sandbox/code.js:ro`],
          Volumes: {
            '/sandbox': {},
          },

          // Environment
          Env: [
            'NODE_ENV=sandbox',
            `QUEST_ID=${options.questId}`,
          ],

          // Remove container automatically
          AutoRemove: true,

          // Logging
          AttachStdout: true,
          AttachStderr: true,
          StdinOnce: true,
          OpenStdin: false,
          Tty: false,
        });

        // Start container
        await container.start();

        // Wait for completion with timeout
        const exitPromise = container.wait();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Execution timeout')), timeoutMs);
        });

        try {
          await Promise.race([exitPromise, timeoutPromise]);
        } catch (timeoutErr) {
          // Kill container on timeout
          try {
            await container.kill();
          } catch (e) {
            // Container might already be stopped
          }
          throw new Error(`Code execution timeout exceeded (${timeoutMs}ms)`);
        }

        // Get logs
        const logs = await container.logs({
          stdout: true,
          stderr: true,
          follow: false,
        });

        const output = logs.toString('utf-8').trim();
        const lines = output.split('\n');
        const lastLine = lines[lines.length - 1];

        // Parse JSON result from last line
        try {
          result = JSON.parse(lastLine);
        } catch (e) {
          result = {
            success: false,
            output: lines,
            errors: [{
              message: 'Failed to parse execution result',
              type: 'ExecutionError',
              line: 0,
            }],
            duration_ms: 0,
          };
        }
      } finally {
        // Cleanup
        if (container) {
          try {
            await container.remove({ force: true });
          } catch (e) {
            // Ignore
          }
        }
        await fs.rm(tmpDir, { recursive: true });
      }

      return result!;
    } finally {
      this.semaphore.release();
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const info = await this.docker.getEvents({
        filters: { type: ['container'] },
      });
      return true;
    } catch (error) {
      console.error('Docker health check failed:', error);
      return false;
    }
  }

  /**
   * Cleanup - remove all sandbox containers
   */
  async cleanup(): Promise<void> {
    try {
      const containers = await this.docker.listContainers({
        filters: { name: ['devlens-sandbox-'] },
        all: true,
      });

      for (const containerInfo of containers) {
        const container = this.docker.getContainer(containerInfo.Id);
        try {
          await container.remove({ force: true });
        } catch (e) {
          // Ignore
        }
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

export default CodeExecutor;
