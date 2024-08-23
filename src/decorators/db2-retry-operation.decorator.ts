// src/decorators/db2-retry-operation.decorator.ts

/**
 * @fileoverview This file contains the implementation of the RetryOperation decorator.
 * The RetryOperation decorator is used to automatically retry a method execution if it fails,
 * up to a specified number of attempts. This decorator is particularly useful for handling
 * transient errors in database operations or network calls, improving reliability by retrying
 * operations that may temporarily fail.
 *
 * @function RetryOperation
 *
 * @exports RetryOperation
 */

/**
 * @function RetryOperation
 * @description A method decorator that automatically retries the execution of the decorated method
 * if it fails, for a specified number of attempts and with a delay between attempts. This decorator
 * captures exceptions thrown by the method, waits for the specified delay, and retries the method.
 * If all attempts fail, the last encountered error is thrown.
 *
 * @param {number} [attempts=3] - The number of retry attempts to make before throwing an error. Defaults to 3.
 * @param {number} [delay=1000] - The delay in milliseconds between each retry attempt. Defaults to 1000ms (1 second).
 * @returns {MethodDecorator} - A method decorator that wraps the original method with retry logic.
 *
 * @throws The last error encountered if all retry attempts fail.
 *
 * @example
 * // Example usage of the RetryOperation decorator in a service class
 * import { Injectable } from "@nestjs/common";
 * import { RetryOperation } from "src/decorators/db2-retry-operation.decorator";
 *
 * @Injectable()
 * class ExampleService {
 *   @RetryOperation(5, 2000)
 *   async someUnreliableOperation() {
 *     // Perform a database operation that might fail
 *   }
 * }
 */
export function RetryOperation(
  attempts: number = 3,
  delay: number = 1000
): MethodDecorator {
  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let lastError; // To keep track of the last error encountered

      // Loop through the number of attempts
      for (let i = 0; i < attempts; i++) {
        try {
          // Try executing the original method
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error; // Capture the error
          await new Promise((resolve) => setTimeout(resolve, delay)); // Wait for the specified delay
        }
      }

      // If all attempts fail, throw the last error encountered
      throw lastError;
    };

    return descriptor;
  };
}
