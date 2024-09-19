// src/decorators/db2-connection-state.decorator.ts

import { Db2Service } from "../services";
import { Db2ConnectionState } from "../enums";
import { Logger } from "@nestjs/common";

/**
 * @function CheckDb2ConnectionState
 * @description A method decorator that checks the state of the Db2Service before proceeding with the method execution.
 * If the current state of the Db2 connection does not match the required state, an error is thrown.
 * This is useful for ensuring that certain operations only proceed when the database connection is in a specific state.
 *
 * @param {Db2ConnectionState | Db2ConnectionState[]} requiredStates - The required state or states of the Db2 connection for the method to execute.
 * @returns {MethodDecorator} - A method decorator that wraps the original method with a connection state check.
 *
 * @throws Error if the Db2Service is not available or if the Db2 connection state does not match any of the required states.
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
export const CheckDb2ConnectionState = (
  requiredStates: Db2ConnectionState | Db2ConnectionState[]
): MethodDecorator => {
  const logger = new Logger("CheckDb2ConnectionStateDecorator");

  return (
    _target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Retrieve the Db2Service instance from the class instance
      const db2Service = (this as any).db2Service as Db2Service;

      // Check if Db2Service is available
      if (!db2Service) {
        const errorMessage = `Db2Service is not available in ${propertyKey.toString()}`;
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      // Normalize requiredStates to an array for consistent checking
      const requiredStatesArray = Array.isArray(requiredStates)
        ? requiredStates
        : [requiredStates];

      // Get the current state of the Db2 connection
      const currentState = db2Service.getState();

      // Check if the current state is one of the required states
      if (!requiredStatesArray.includes(currentState.connectionState)) {
        const errorMessage = `DB2 connection state must be one of [${requiredStatesArray.join(
          ", "
        )}] but is currently ${currentState}`;
        logger.warn(errorMessage);
        throw new Error(errorMessage);
      }

      // Log the successful state check
      logger.debug(
        `DB2 connection state check passed for method ${propertyKey.toString()}`
      );

      // Proceed with the original method execution if the state check passes
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
};
