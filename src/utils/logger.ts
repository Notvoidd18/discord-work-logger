export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

class Logger {
  private format(level: LogLevel, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
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
}

export const logger = new Logger();
