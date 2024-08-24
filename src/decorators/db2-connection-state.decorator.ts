// src/decorators/db2-connection-state.decorator.ts

/**
 * @fileoverview This file contains the implementation of the CheckDb2ConnectionState decorator.
 * This decorator checks the state of the Db2 connection before executing the decorated method.
 * It ensures that the Db2 connection is in a specific required state, providing a mechanism to guard
 * methods against execution when the database connection is not in the expected state.
 *
 * @function CheckDb2ConnectionState
 *
 * @requires Db2Service from "src/services/db2.service"
 * @requires Db2ConnectionState from "src/enums/db2.enums"
 *
 * @exports CheckDb2ConnectionState
 */

import { Db2Service } from "src/services/db2.service";
import { Db2ConnectionState } from "src/enums/db2.enums";

/**
 * @function CheckDb2ConnectionState
 * @description A method decorator that checks the state of the Db2Service before proceeding with the method execution.
 * If the current state of the Db2 connection does not match the required state, an error is thrown.
 * This is useful for ensuring that certain operations only proceed when the database connection is in a specific state.
 *
 * @param {Db2ConnectionState} requiredState - The required state of the Db2 connection for the method to execute.
 * @returns {MethodDecorator} - A method decorator that wraps the original method with a connection state check.
 *
 * @throws Error if the Db2Service is not available or if the Db2 connection state does not match the required state.
 *
 * @example
 * // Example usage of the decorator
 * class ExampleClass {
 *   constructor(private db2Service: Db2Service) {}
 *
 *   @CheckDb2ConnectionState(Db2ConnectionState.CONNECTED)
 *   async someMethod() {
 *     // Method logic here
 *   }
 * }
 */
export function CheckDb2ConnectionState(
  requiredState: Db2ConnectionState
): MethodDecorator {
  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Access the instance's Db2Service to check the connection state
      const db2Service = (this as any).db2Service as Db2Service;

      // Check if Db2Service is available
      if (!db2Service) {
        throw new Error("Db2Service is not available");
      }

      // Check if the current Db2 connection state matches the required state
      if (db2Service.getState() !== requiredState) {
        throw new Error(`DB2 connection state must be ${requiredState}`);
      }

      // Proceed with the original method execution if the state check passes
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
