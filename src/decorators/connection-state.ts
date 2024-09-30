import { Db2ConnectionState } from '../enums';
import { Logger } from '../utils';
import { IConnectionManager } from '../interfaces';

/**
 * @function CheckDb2ConnectionState
 * @description A method decorator that checks the state of the DB2 connection using the ConnectionManager
 * before proceeding with the method execution. If the current state of the DB2 connection does not match the required state,
 * an error is thrown. This is useful for ensuring that certain operations only proceed when the database connection is in a specific state.
 *
 * @param {Db2ConnectionState | Db2ConnectionState[]} requiredStates - The required state or states of the DB2 connection for the method to execute.
 * @returns {MethodDecorator} - A method decorator that wraps the original method with a connection state check.
 *
 * @throws Error if the ConnectionManager is not available or if the DB2 connection state does not match any of the required states.
 *
 * @example
 * // Example usage of the decorator
 * class ExampleClass {
 *   constructor(private connectionManager: ConnectionManager) {}
 *
 *   @CheckDb2ConnectionState(Db2ConnectionState.CONNECTED)
 *   async someMethod() {
 *     // Method logic here
 *   }
 * }
 */
export const CheckConnectionState = (
  requiredStates: Db2ConnectionState | Db2ConnectionState[],
): MethodDecorator => {
  const logger = new Logger('ConnectionManagerDecorator');

  return (
    _target: new (...args: any[]) => any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Attempt to get the ConnectionManager instance from the class using 'this'
      const connectionManager: IConnectionManager = (this as any)
        .db2ConnectionManager;

      // Check if ConnectionManager is available
      if (!connectionManager) {
        const errorMessage = `ConnectionManager is not available in ${propertyKey.toString()}`;
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      // Normalize requiredStates to an array for consistent checking
      const requiredStatesArray = Array.isArray(requiredStates)
        ? requiredStates
        : [requiredStates];

      // Get the current state of the DB2 connection
      let currentState;
      try {
        currentState = connectionManager.getState().connectionState;
      } catch (error) {
        const errorMessage = `Failed to get DB2 connection state: ${error.message}`;
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      // Check if the current state is one of the required states
      if (!requiredStatesArray.includes(currentState)) {
        const errorMessage = `DB2 connection state must be one of [${requiredStatesArray.join(
          ', ',
        )}] but is currently ${currentState}`;
        logger.warn(errorMessage);
        throw new Error(errorMessage);
      }

      // Log the successful state check
      logger.debug(
        `DB2 connection state check passed for method ${propertyKey.toString()}`,
      );

      // Proceed with the original method execution if the state check passes
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
};
