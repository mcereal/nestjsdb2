// src/decorators/db2-retry-operation.decorator.ts

import { Logger } from '@nestjs/common';

/**
 * @function RetryOperation
 * @description A method decorator that automatically retries the execution of the decorated method
 * if it fails, for a specified number of attempts and with a delay between attempts. This decorator
 * captures exceptions thrown by the method, waits for the specified delay, and retries the method.
 * It supports exponential backoff and optional error type filtering.
 *
 * @param {number} [attempts=3] - The number of retry attempts to make before throwing an error. Defaults to 3.
 * @param {number} [delay=1000] - The initial delay in milliseconds between each retry attempt. Defaults to 1000ms (1 second).
 * @param {boolean} [exponentialBackoff=false] - If true, applies exponential backoff to the delay.
 * @param {Function} [shouldRetry] - Optional function to determine if a retry should occur based on the error. Defaults to always retry.
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
 *   @RetryOperation(5, 2000, true, (error) => error instanceof NetworkError)
 *   async someUnreliableOperation() {
 *     // Perform a database operation that might fail
 *   }
 * }
 */
export function RetryOperation(
  attempts = 3,
  delay = 1000,
  exponentialBackoff = false,
  shouldRetry: (error: any) => boolean = () => true,
): MethodDecorator {
  const logger = new Logger('RetryOperationDecorator');

  return function (
    _target: new (...args: any[]) => any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let lastError; // To keep track of the last error encountered
      let currentDelay = delay; // Current delay between retries

      for (let i = 0; i < attempts; i++) {
        try {
          logger.debug(`Attempt ${i + 1} for method ${propertyKey.toString()}`);
          // Try executing the original method
          const result = await originalMethod.apply(this, args);
          logger.debug(
            `Method ${propertyKey.toString()} succeeded on attempt ${i + 1}`,
          );
          return result; // Return the result if successful
        } catch (error) {
          // Log the error
          logger.warn(
            `Method ${propertyKey.toString()} failed on attempt ${
              i + 1
            } with error: ${error.message}`,
          );

          // Check if the error is retryable
          if (!shouldRetry(error)) {
            logger.error(`Error is not retryable. Aborting retries.`);
            throw error; // Rethrow if not retryable
          }

          lastError = error; // Capture the error
          if (i < attempts - 1) {
            // If not the last attempt, wait for the specified delay
            await new Promise((resolve) => setTimeout(resolve, currentDelay));

            // Apply exponential backoff if enabled
            if (exponentialBackoff) {
              currentDelay *= 2; // Double the delay for exponential backoff
            }
          }
        }
      }

      // If all attempts fail, throw the last error encountered
      logger.error(
        `All retry attempts failed for method ${propertyKey.toString()}`,
      );
      throw lastError;
    };

    return descriptor;
  };
}
