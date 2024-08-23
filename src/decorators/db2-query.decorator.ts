/**
 * @fileoverview This file contains the implementation of the Db2Query decorator.
 * The Db2Query decorator is used to automatically execute a specified Db2 query
 * before the decorated method runs. It provides a convenient way to encapsulate
 * and reuse query execution logic, ensuring that methods interacting with the database
 * have consistent query execution and error handling.
 *
 * @function Db2Query
 *
 * @requires Db2Service from "src/services/db2.service"
 *
 * @exports Db2Query
 */

import { Db2Service } from "src/services/db2.service";

/**
 * @function Db2Query
 * @description A method decorator for executing a specific Db2 query before executing
 * the decorated method. The decorator injects Db2Service to execute the query, handles errors,
 * and optionally calls the original method if additional behavior is needed after the query execution.
 *
 * @param {string} query - The SQL query string to be executed before the method execution.
 * @returns {MethodDecorator} - A method decorator that wraps the original method with Db2 query execution.
 *
 * @throws Error if Db2Service is not available or if there is an error during query execution.
 *
 * @example
 * // Example usage of the Db2Query decorator in a class method
 * import { Injectable } from "@nestjs/common";
 * import { Db2Query } from "src/decorators/db2-query.decorator";
 * import { Db2Service } from "src/services/db2.service";
 *
 * @Injectable()
 * class ExampleService {
 *   constructor(private db2Service: Db2Service) {}
 *
 *   @Db2Query("SELECT * FROM users WHERE id = ?")
 *   async getUserById(userId: number) {
 *     // This method will automatically execute the Db2 query before proceeding
 *     return { userId };
 *   }
 * }
 */
export function Db2Query(query: string): MethodDecorator {
  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value; // Save a reference to the original method

    descriptor.value = async function (...args: any[]) {
      // Retrieve the Db2Service instance from the class instance
      const db2Service = (this as any).db2Service as Db2Service;

      // Check if Db2Service is available
      if (!db2Service) {
        throw new Error("Db2Service is not available");
      }

      try {
        // Execute the specified Db2 query using the provided arguments
        const result = await db2Service.query(query, args);

        // Optionally call the original method if its behavior is needed
        // Uncomment the line below if original method behavior is required
        // await originalMethod.apply(this, args);

        return result; // Return the result of the Db2 query
      } catch (error) {
        // Throw an error if the Db2 query execution fails
        throw new Error(`Error executing query: ${error.message}`);
      }
    };

    return descriptor;
  };
}
