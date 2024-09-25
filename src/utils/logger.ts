// src/logger/logger.ts
import { ILogger } from '../interfaces';
import { LogLevel } from '../enums';
import { ColorCodes, ResetCode } from './color-codes';

export class Logger implements ILogger {
  private context: string;
  private currentLogLevel: LogLevel;
  private useColors: boolean;

  constructor(
    context: string,
    logLevel: LogLevel = LogLevel.INFO,
    useColors: boolean = true,
  ) {
    this.context = context;
    this.currentLogLevel = logLevel;
    this.useColors = useColors;
  }

  setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = [
      LogLevel.ERROR,
      LogLevel.WARN,
      LogLevel.INFO,
      LogLevel.DEBUG,
      LogLevel.VERBOSE,
    ];
    return levels.indexOf(level) <= levels.indexOf(this.currentLogLevel);
  }

  /**
   * Processes unknown data types into a string format suitable for logging.
   * @param data - The unknown data to process.
   * @returns A string representation of the data.
   */
  private processUnknown(data?: unknown): string {
    if (data === undefined) {
      return '';
    }

    if (typeof data === 'string') {
      return data;
    }

    if (data instanceof Error) {
      return `${data.message}\n${data.stack}`;
    }

    try {
      return JSON.stringify(data, this.circularReplacer());
    } catch (e) {
      return 'Unable to stringify additional data';
    }
  }

  /**
   * Handles circular references in objects.
   * @returns A replacer function for JSON.stringify.
   */
  private circularReplacer() {
    const seen = new WeakSet();
    return (_key: string, value: any) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    };
  }

  private formatTimestamp(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();

    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'

    return `${month}/${day}/${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    additionalData?: string,
  ): string {
    const timestamp = this.formatTimestamp();
    const pid = process.pid;
    const white = ColorCodes['white'];
    const yellow = ColorCodes['yellow'];
    const reset = ResetCode;
    const color = ColorCodes[level] || '';

    // Construct the timestamp part in white
    let formattedMessage = `${white}${pid} - ${timestamp}${reset} `;

    // Add [LOG_LEVEL] in its respective color
    formattedMessage += `${color}[${level.toUpperCase()}]${reset} `;

    // Add [Context] in white
    formattedMessage += `${yellow}[${this.context}]${reset} `;

    // Add message in the color corresponding to log level
    formattedMessage += `${color}${message}${reset}`;

    // Append additional data if present
    if (additionalData) {
      formattedMessage += ` | ${color}${additionalData}${reset}`;
    }

    return formattedMessage;
  }

  error(message: string, trace?: unknown): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const formattedTrace = this.processUnknown(trace);
      console.error(
        this.formatMessage(LogLevel.ERROR, message, formattedTrace),
      );
    }
  }

  warn(message: string, context?: unknown): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const formattedContext = this.processUnknown(context);
      console.warn(
        this.formatMessage(LogLevel.WARN, message, formattedContext),
      );
    }
  }

  info(message: string, context?: unknown): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const formattedContext = this.processUnknown(context);
      console.info(
        this.formatMessage(LogLevel.INFO, message, formattedContext),
      );
    }
  }

  debug(message: string, context?: unknown): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const formattedContext = this.processUnknown(context);
      console.debug(
        this.formatMessage(LogLevel.DEBUG, message, formattedContext),
      );
    }
  }

  verbose(message: string, context?: unknown): void {
    if (this.shouldLog(LogLevel.VERBOSE)) {
      const formattedContext = this.processUnknown(context);
      console.log(
        this.formatMessage(LogLevel.VERBOSE, message, formattedContext),
      );
    }
  }
}
