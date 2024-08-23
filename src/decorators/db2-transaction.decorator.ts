/**
 * @fileoverview This file contains the implementation of the Transaction decorator.
 * The Transaction decorator is used to wrap a method in a database transaction, ensuring
 * that all operations within the method are executed within a single transaction context.
 * If the method completes successfully, the transaction is committed. If an error occurs,
 * the transaction is rolled back, ensuring data consistency and integrity.
 *
 * @function Transaction
 *
 * @requires Db2Service from "src/services/db2.service"
 *
 * @exports Transaction
 */

import { Db2Service } from "src/services/db2.service";

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
  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Retrieve the Db2Service instance from the class instance
      const db2Service = (this as any).db2Service as Db2Service;

      // Check if Db2Service is available
      if (!db2Service) {
        throw new Error("Db2Service is not available");
      }

      // Begin a transaction
      await db2Service.beginTransaction();

      try {
        // Execute the original method within the transaction
        const result = await originalMethod.apply(this, args);

        // Commit the transaction if the method completes successfully
        await db2Service.commitTransaction();
        return result;
      } catch (error) {
        // Roll back the transaction if an error occurs
        await db2Service.rollbackTransaction();
        throw error; // Rethrow the error after rolling back the transaction
      }
    };

    return descriptor;
  };
}
