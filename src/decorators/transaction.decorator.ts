import { Logger } from '../utils';
import { IConnectionManager } from '../interfaces';

/**
 * @function Transaction
 * @description A method decorator that wraps the decorated method in a Db2 database transaction.
 * It begins a transaction before the method execution, commits the transaction if the method
 * completes successfully, or rolls back the transaction if an error occurs. This ensures
 * atomicity and data integrity for database operations within the method.
 *
 * @returns {MethodDecorator} - A method decorator that wraps the original method with transaction management.
 *
 * @throws Error if Db2ConnectionManager is not available or if an error occurs during transaction management.
 *
 * @example
 * // Example usage of the Transaction decorator in a service class
 * import { Injectable } from "@nestjs/common";
 * import { Transaction } from "src/decorators/db2-transaction.decorator";
 * import { Db2ConnectionManager } from "src/connection-manager/db2-connection-manager";
 *
 * @Injectable()
 * class ExampleService {
 *   constructor(private db2ConnectionManager: Db2ConnectionManager) {}
 *
 *   @Transaction()
 *   async performDatabaseOperation() {
 *     // All operations within this method will be executed within a transaction
 *   }
 * }
 */
export function Transaction(): MethodDecorator {
  const logger = new Logger('TransactionDecorator');

  return function (
    _target: new (...args: any[]) => any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Retrieve the Db2ConnectionManager instance from the class
      const db2ConnectionManager: IConnectionManager = (this as any)
        .db2ConnectionManager;

      // Check if Db2ConnectionManager is available
      if (!db2ConnectionManager) {
        const errorMessage = 'Db2ConnectionManager is not available';
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      // Retrieve the Db2Client instance from the connection manager
      const db2Client = (this as any).db2Client;

      if (!db2Client) {
        const errorMessage = 'Db2Client is not available';
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      // Start a transaction
      try {
        logger.debug(
          `Starting transaction for method ${propertyKey.toString()}`,
        );
        await db2Client.beginTransaction();

        // Execute the original method within the transaction
        const result = await originalMethod.apply(this, args);

        // Commit the transaction if the method completes successfully
        await db2Client.commitTransaction();
        logger.debug(
          `Transaction committed successfully for method ${propertyKey.toString()}`,
        );

        return result;
      } catch (error) {
        // Roll back the transaction if an error occurs
        logger.error(
          `Transaction failed for method ${propertyKey.toString()}: ${error.message}`,
        );
        try {
          await db2Client.rollbackTransaction();
          logger.debug(
            `Transaction rolled back for method ${propertyKey.toString()}`,
          );
        } catch (rollbackError) {
          logger.error(
            `Failed to roll back transaction for method ${propertyKey.toString()}: ${rollbackError.message}`,
          );
        }

        // Rethrow the original error after rollback attempt
        throw error;
      }
    };

    return descriptor;
  };
}
