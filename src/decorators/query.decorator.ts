import { Logger } from '../utils';
import { IConnectionManager } from '../interfaces';

/**
 * @function Query
 * @description A method decorator that uses Db2ConnectionManager to acquire a connection,
 * execute the given query, and then release the connection back to the pool.
 *
 * @param {string} query - The SQL query to execute.
 * @param {boolean} [executeQuery=true] - A flag to control whether to execute the query or bypass it.
 * @returns {MethodDecorator} - A method decorator that wraps the original method with query execution logic.
 *
 * @throws Error if Db2ConnectionManager is not available or if there is an error during query execution.
 *
 * @example
 * class ExampleClass {
 *   constructor(private db2ConnectionManager: Db2ConnectionManager) {}
 *
 *   @Db2Query('SELECT * FROM users WHERE id = ?', true)
 *   async getUserData(userId: string) {
 *     // Method logic here, `queryResult` is injected as the first parameter
 *   }
 * }
 */
export const Query = (query: string, executeQuery = true): MethodDecorator => {
  const logger = new Logger('Db2QueryDecorator');

  return (
    _target: new (...args: any[]) => any,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Get the Db2ConnectionManager instance from the class using 'this'
      const db2ConnectionManager: IConnectionManager = (this as any)
        .db2ConnectionManager;

      // Check if Db2ConnectionManager is available
      if (!db2ConnectionManager) {
        logger.error('Db2ConnectionManager is not available on the instance');
        throw new Error('Db2ConnectionManager is not available');
      }

      // Get the Db2Client instance from the connection manager
      const db2Client = (this as any).db2Client;

      if (!db2Client) {
        logger.error('Db2Client is not available on the instance');
        throw new Error('Db2Client is not available');
      }

      let connection;
      let queryResult;

      if (executeQuery) {
        try {
          // Acquire a connection from the connection manager
          connection = await db2ConnectionManager.getConnection();
          logger.info(`Acquired DB2 connection for query: ${query}`);

          // Execute the query using the acquired connection
          queryResult = await db2Client.query(query, args);
          logger.info(`Query executed successfully: ${query}`);
        } catch (error) {
          logger.error(`Error executing query: ${query} - ${error.message}`);
          throw new Error(`Error executing query: ${error.message}`);
        } finally {
          // Release the connection back to the pool
          if (connection) {
            await db2ConnectionManager.closeConnection(connection);
            logger.info(`DB2 connection released for query: ${query}`);
          }
        }
      } else {
        logger.warn(`Query execution bypassed for: ${query}`);
      }

      // Inject the query result as the first argument to the original method
      return await originalMethod.apply(this, [queryResult, ...args]);
    };

    return descriptor;
  };
};
