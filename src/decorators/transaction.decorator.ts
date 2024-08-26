// src/decorators/db2-transaction.decorator.ts

import { Db2Service } from "../services";
import { Logger } from "@nestjs/common";

/**
 * @function Transaction
 * @description A method decorator that wraps the decorated method in a Db2 database transaction.
 * It begins a transaction before the method execution, commits the transaction if the method
 * completes successfully, or rolls back the transaction if an error occurs. This ensures
 * atomicity and data integrity for database operations within the method.
 *
 * @returns {MethodDecorator} - A method decorator that wraps the original method with transaction management.
 *
 * @throws Error if Db2Service is not available or if an error occurs during transaction management.
 *
 * @example
 * // Example usage of the Transaction decorator in a service class
 * import { Injectable } from "@nestjs/common";
 * import { Transaction } from "src/decorators/db2-transaction.decorator";
 * import { Db2Service } from "src/services/db2.service";
 *
 * @Injectable()
 * class ExampleService {
 *   constructor(private db2Service: Db2Service) {}
 *
 *   @Transaction()
 *   async performDatabaseOperation() {
 *     // All operations within this method will be executed within a transaction
 *   }
 * }
 */
export function Transaction(): MethodDecorator {
  const logger = new Logger("TransactionDecorator");

  return function (
    _target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Retrieve the Db2Service instance from the class instance
      const db2Service = (this as any).db2Service as Db2Service;

      // Check if Db2Service is available
      if (!db2Service) {
        const errorMessage = "Db2Service is not available";
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      // Start a transaction
      try {
        logger.debug(
          `Starting transaction for method ${propertyKey.toString()}`
        );
        await db2Service.beginTransaction();

        // Execute the original method within the transaction
        const result = await originalMethod.apply(this, args);

        // Commit the transaction if the method completes successfully
        await db2Service.commitTransaction();
        logger.debug(
          `Transaction committed successfully for method ${propertyKey.toString()}`
        );

        return result;
      } catch (error) {
        // Roll back the transaction if an error occurs
        logger.error(
          `Transaction failed for method ${propertyKey.toString()}: ${
            error.message
          }`
        );
        try {
          await db2Service.rollbackTransaction();
          logger.debug(
            `Transaction rolled back for method ${propertyKey.toString()}`
          );
        } catch (rollbackError) {
          logger.error(
            `Failed to roll back transaction for method ${propertyKey.toString()}: ${
              rollbackError.message
            }`
          );
        }

        // Rethrow the original error after rollback attempt
        throw error;
      }
    };

    return descriptor;
  };
}
