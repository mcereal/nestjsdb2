// src/decorators/log-execution-time.decorator.ts

/**
 * @fileoverview This file contains the implementation of the LogExecutionTime decorator.
 * The LogExecutionTime decorator is used to log the execution time of methods, providing
 * insights into the performance of various operations. By measuring and logging the time
 * taken for a method to execute, developers can identify bottlenecks and optimize critical
 * sections of code.
 *
 * @function LogExecutionTime
 *
 * @requires Logger from "@nestjs/common"
 *
 * @exports LogExecutionTime
 */

import { Logger } from "@nestjs/common";

/**
 * @function LogExecutionTime
 * @description A method decorator that logs the execution time of the decorated method.
 * This decorator captures the start time before the method executes and calculates the duration
 * after the method completes. The execution time is logged using the NestJS Logger, allowing
 * developers to monitor performance and identify slow operations.
 *
 * @returns {MethodDecorator} - A method decorator that wraps the original method with execution time logging.
 *
 * @example
 * // Example usage of the LogExecutionTime decorator in a service class
 * import { Injectable } from "@nestjs/common";
 * import { LogExecutionTime } from "src/decorators/log-execution-time.decorator";
 *
 * @Injectable()
 * class ExampleService {
 *   @LogExecutionTime()
 *   async someDatabaseOperation() {
 *     // Perform a database operation
 *   }
 * }
 */
export function LogExecutionTime(): MethodDecorator {
  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = Date.now(); // Capture the start time before method execution
      const result = await originalMethod.apply(this, args); // Execute the original method
      const duration = Date.now() - start; // Calculate the duration of method execution

      const logger = new Logger(_propertyKey.toString()); // Create a logger instance for the method
      logger.log(`Execution time: ${duration}ms`); // Log the execution time

      return result; // Return the result of the original method
    };

    return descriptor;
  };
}
