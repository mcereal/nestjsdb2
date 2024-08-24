// src/errors/db2.error.ts

/**
 * @fileoverview This file contains custom error classes for Db2-related errors.
 * These errors are used to provide more specific information about the type of error
 * that occurred during Db2 operations, such as query execution, connection errors, or authentication errors.
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
 *
 * @requires Error from "error"
 */

/**
 * Custom error class for Db2-related errors.
 */
export class Db2Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Db2Error";
  }
}

/**
 * Custom error class for Db2 query errors.
 */
export class Db2TimeoutError extends Db2Error {
  constructor(message: string) {
    super(message);
    this.name = "Db2TimeoutError";
  }
}

/**
 * Custom error class for Db2 authentication errors.
 */
export class Db2AuthenticationError extends Db2Error {
  constructor(message: string) {
    super(message);
    this.name = "Db2AuthenticationError";
  }
}

/**
 * Custom error class for Db2 connection errors.
 */
export class Db2ConnectionError extends Db2Error {
  constructor(message: string) {
    super(message);
    this.name = "Db2ConnectionError";
  }
}
