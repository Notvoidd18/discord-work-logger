export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

export class Logger {
  private prefix: string;

  constructor(prefix: string = 'system') {
    this.prefix = prefix;
  }

  private format(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${this.prefix}] ${message}`;
  }

  info(message: string, ...args: unknown[]) {
    console.log(this.format(LogLevel.INFO, message), ...args);
  }

  warn(message: string, ...args: unknown[]) {
    console.warn(this.format(LogLevel.WARN, message), ...args);
  }

  error(message: string, ...args: unknown[]) {
    console.error(this.format(LogLevel.ERROR, message), ...args);
  }

  debug(message: string, ...args: unknown[]) {
    if (process.env.DEBUG === 'true') {
      console.debug(this.format(LogLevel.DEBUG, message), ...args);
    }
  }

  forBot(botId: string): Logger {
    return new Logger(botId);
  }
}

export const logger = new Logger('platform');
