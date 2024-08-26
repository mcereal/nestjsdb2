// src/decorators/log-execution-time.decorator.ts

import { Logger } from "@nestjs/common";

/**
 * @function LogExecutionTime
 * @description A method decorator that logs the execution time of the decorated method.
 * This decorator captures the start time before the method executes and calculates the duration
 * after the method completes. It supports both synchronous and asynchronous methods. The execution
 * time is logged using the NestJS Logger, allowing developers to monitor performance and identify
 * slow operations.
 *
 * @param {number} [threshold=0] - The minimum duration (in milliseconds) that must be exceeded
 *                                 before logging the execution time. Defaults to 0 (always log).
 * @param {'log' | 'warn' | 'error' | 'debug' | 'verbose'} [logLevel='log'] - The log level to use.
 * @returns {MethodDecorator} - A method decorator that wraps the original method with execution time logging.
 *
 * @example
 * // Example usage of the LogExecutionTime decorator in a service class
 * import { Injectable } from '@nestjs/common';
 * import { LogExecutionTime } from 'src/decorators/log-execution-time.decorator';
 *
 * @Injectable()
 * class ExampleService {
 *   @LogExecutionTime(1000, 'warn') // Only log if execution time exceeds 1000ms, using the 'warn' log level
 *   async someDatabaseOperation() {
 *     // Perform a database operation
 *   }
 * }
 */
export const LogExecutionTime = (
  threshold: number = 0,
  logLevel: "log" | "warn" | "error" | "debug" | "verbose" = "log"
): MethodDecorator => {
  return function (
    target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const start = Date.now(); // Capture the start time before method execution
      const logger = new Logger(target.constructor.name); // Create a logger instance for the class

      const execute = () => {
        const result = originalMethod.apply(this, args); // Execute the original method
        const duration = Date.now() - start; // Calculate the duration of method execution

        // Log if the duration exceeds the threshold
        if (duration > threshold) {
          logger[logLevel](
            `Execution time for ${String(propertyKey)}: ${duration}ms`
          );
        }

        return result;
      };

      // Check if the method is asynchronous
      if (originalMethod.constructor.name === "AsyncFunction") {
        return execute()
          .then((result) => result)
          .catch((error) => {
            logger.error(
              `Error in method ${String(propertyKey)}: ${error.message}`
            );
            throw error;
          });
      }

      // Synchronous method execution
      try {
        return execute();
      } catch (error) {
        logger.error(
          `Error in method ${String(propertyKey)}: ${error.message}`
        );
        throw error;
      }
    };

    return descriptor;
  };
};
