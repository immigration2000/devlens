import pino, { Logger as PinoLogger } from 'pino';

export type DevLensLogger = PinoLogger;

export function createLogger(service: string): DevLensLogger {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

  const baseConfig = {
    level: logLevel,
    base: {
      service,
      pid: process.pid,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  if (isDevelopment) {
    return pino(
      {
        ...baseConfig,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: false,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    );
  }

  return pino(baseConfig);
}
