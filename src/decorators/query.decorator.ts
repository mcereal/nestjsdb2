// src/decorators/db2-query.decorator.ts

import { Db2Service } from "src/services/db2.service";
import { Logger } from "@nestjs/common";

/**
 * @function Db2Query
 * @description A method decorator for executing a specific Db2 query before executing
 * the decorated method. The decorator injects Db2Service to execute the query, handles errors,
 * logs results, and optionally calls the original method if additional behavior is needed after the query execution.
 *
 * @param {string} query - The SQL query string to be executed before the method execution.
 * @param {boolean} [executeQuery=true] - Flag to determine if the query should be executed. Useful for testing and conditional behavior.
 * @returns {MethodDecorator} - A method decorator that wraps the original method with Db2 query execution.
 *
 * @throws Error if Db2Service is not available or if there is an error during query execution.
 */
export const Db2Query = (
  query: string,
  executeQuery: boolean = true
): MethodDecorator => {
  const logger = new Logger("Db2QueryDecorator");

  return (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    const originalMethod = descriptor.value; // Save a reference to the original method

    descriptor.value = async function (...args: any[]) {
      // Retrieve the Db2Service instance from the class instance
      const db2Service = (this as any).db2Service as Db2Service;

      // Check if Db2Service is available
      if (!db2Service) {
        logger.error("Db2Service is not available on the instance");
        throw new Error("Db2Service is not available");
      }

      let queryResult;
      if (executeQuery) {
        try {
          // Log the start of the query execution
          logger.log(
            `Executing query: ${query} with args: ${JSON.stringify(args)}`
          );

          // Execute the specified Db2 query using the provided arguments
          queryResult = await db2Service.query(query, args);

          // Log the successful execution of the query
          logger.log(`Query executed successfully: ${query}`);
        } catch (error) {
          // Log the error and throw it
          logger.error(`Error executing query: ${query} - ${error.message}`);
          throw new Error(`Error executing query: ${error.message}`);
        }
      } else {
        logger.warn(`Query execution bypassed for: ${query}`);
      }

      // Call the original method and pass the query result as an additional argument
      const originalResult = await originalMethod.apply(this, [
        queryResult,
        ...args,
      ]);

      // Return the original method's result
      return originalResult;
    };

    return descriptor;
  };
};
