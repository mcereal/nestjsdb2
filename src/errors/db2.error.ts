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

import { Logger } from "@nestjs/common";

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
/**
 * Custom error class for Db2 transaction errors.
 */
export class Db2TransactionError extends Db2Error {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, "DB2_TRANSACTION_ERROR", metadata);
    this.name = "Db2TransactionError";
  }
}

export class Db2QuerySyntaxError extends Db2Error {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, "DB2_QUERY_SYNTAX_ERROR", metadata);
    this.name = "Db2QuerySyntaxError";
  }
}

export class Db2PoolError extends Db2Error {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, "DB2_POOL_ERROR", metadata);
    this.name = "Db2PoolError";
  }
}

export function formatDb2Error(
  error: any,
  context: string,
  metadata?: Record<string, any>
): string {
  const errorCode = error.code || "UNKNOWN_ERROR";
  const errorMessage = error.message || "An unknown error occurred";
  const metadataString = metadata ? JSON.stringify(metadata, null, 2) : "";
  const stackTrace = error.stack ? `\nStack Trace: ${error.stack}` : "";

  return `Error in ${context} - Code: ${errorCode}, Message: ${errorMessage}${stackTrace}${
    metadataString ? `\nMetadata: ${metadataString}` : ""
  }`;
}

export function handleDb2Error(
  error: any,
  context: string,
  options: { host: string; database: string },
  logger: Logger = new Logger("Db2Error")
): void {
  const formattedError = formatDb2Error(error, context, options);

  // Log the formatted error
  logger.error(formattedError);

  // Check the type of error and throw the appropriate custom error
  if (error instanceof Db2QuerySyntaxError) {
    throw new Db2QuerySyntaxError(formattedError, error.metadata);
  } else if (error instanceof Db2TimeoutError) {
    throw new Db2TimeoutError(formattedError, error.metadata);
  } else if (error instanceof Db2ConnectionError) {
    throw new Db2ConnectionError(formattedError, error.metadata);
  } else if (error instanceof Db2AuthenticationError) {
    throw new Db2AuthenticationError(formattedError, error.metadata);
  } else if (error instanceof Db2TransactionError) {
    throw new Db2TransactionError(formattedError, error.metadata);
  } else if (error instanceof Db2PoolError) {
    throw new Db2PoolError(formattedError, error.metadata);
  } else if (error instanceof Db2Error) {
    throw new Db2Error(formattedError, JSON.stringify(error.metadata));
  } else {
    // Fallback for unknown errors
    throw new Db2Error(
      `Unknown error occurred in ${context}`,
      JSON.stringify({
        originalError: formattedError,
      })
    );
  }
}
