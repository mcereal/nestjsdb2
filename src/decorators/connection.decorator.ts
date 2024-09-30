import { Logger } from '../utils';
import { IConnectionManager } from '../interfaces';

/**
 * @function Connection
 * @description A method decorator that automatically acquires a DB2 connection using Db2ConnectionManager
 * before the decorated method executes. The connection is released back to the pool after
 * method execution, whether it succeeds or fails.
 *
 * @returns {MethodDecorator} - A method decorator that wraps the original method with connection handling.
 *
 * @throws Error if the Db2ConnectionManager is not available or if there is an issue acquiring the connection.
 *
 * @example
 * class ExampleClass {
 *   constructor(private db2ConnectionManager: Db2ConnectionManager) {}
 *
 *   @Connection()
 *   async getUserData(userId: string) {
 *     return this.db2Client.query('SELECT * FROM users WHERE id = ?', [userId]);
 *   }
 * }
 */
export const Connection = (): MethodDecorator => {
  const logger = new Logger('ConnectionDecorator');

  return (
    _target: new (...args: any[]) => any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Get the Db2ConnectionManager instance from the class using 'this'
      const db2ConnectionManager: IConnectionManager = (this as any)
        .db2ConnectionManager;

      // Check if Db2ConnectionManager is available
      if (!db2ConnectionManager) {
        const errorMessage = `Db2ConnectionManager is not available in ${propertyKey.toString()}`;
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      let connection;
      try {
        // Acquire the connection from the connection manager
        connection = await db2ConnectionManager.getConnection();
        logger.info(
          `DB2 connection acquired for method ${propertyKey.toString()}`,
        );

        // Proceed with the original method execution
        const result = await originalMethod.apply(this, args);

        // Release the connection back to the pool
        await db2ConnectionManager.closeConnection(connection);
        logger.info(
          `DB2 connection released for method ${propertyKey.toString()}`,
        );

        return result;
      } catch (error) {
        logger.error(`Error in method ${propertyKey.toString()}:`, error);

        // Release the connection back to the pool in case of an error
        if (connection) {
          await db2ConnectionManager.closeConnection(connection);
          logger.info(
            `DB2 connection released after error in method ${propertyKey.toString()}`,
          );
        }

        throw error; // Re-throw the error after cleaning up
      }
    };

    return descriptor;
  };
};
