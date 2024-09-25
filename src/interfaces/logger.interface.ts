import { LogLevel } from '../enums';

export interface ILogger {
  setLogLevel(level: LogLevel): void;
  error(message: string, trace?: unknown): void;
  warn(message: string, context?: unknown): void;
  info(message: string, context?: unknown): void;
  debug(message: string, context?: unknown): void;
  verbose(message: string, context?: unknown): void;
}
