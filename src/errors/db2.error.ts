/**
 * @fileoverview This file contains custom error classes for Db2-related errors.
 * These errors provide specific information about the type of error that occurred during Db2 operations,
 * such as query execution, connection errors, or authentication errors.
 * The custom error classes extend the base Error class and provide additional context for handling and debugging errors.
 *
 * @class Db2Error
 * @class Db2TimeoutError
 * @class Db2AuthenticationError
 * @class Db2ConnectionError
 *
 * @exports Db2Error
 * @exports Db2TimeoutError
 * @exports Db2AuthenticationError
 * @exports Db2ConnectionError
 */

/**
 * Custom error class for Db2-related errors.
 */
export class Db2Error extends Error {
  public errorCode: string;
  public metadata?: Record<string, any>;
  public timestamp: string;

  constructor(
    message: string,
    errorCode: string = "DB2_ERROR",
    metadata?: Record<string, any>
  ) {
    super(message);
    this.name = "Db2Error";
    this.errorCode = errorCode;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      errorCode: this.errorCode,
      metadata: this.metadata,
      timestamp: this.timestamp,
    };
  }

  toString(): string {
    return JSON.stringify(this.toJSON());
  }
}

/**
 * Custom error class for Db2 query timeout errors.
 */
export class Db2TimeoutError extends Db2Error {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, "DB2_TIMEOUT_ERROR", metadata);
    this.name = "Db2TimeoutError";
  }
}

/**
 * Custom error class for Db2 authentication errors.
 */
export class Db2AuthenticationError extends Db2Error {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, "DB2_AUTHENTICATION_ERROR", metadata);
    this.name = "Db2AuthenticationError";
  }
}

/**
 * Custom error class for Db2 connection errors.
 */
export class Db2ConnectionError extends Db2Error {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, "DB2_CONNECTION_ERROR", metadata);
    this.name = "Db2ConnectionError";
  }
}
