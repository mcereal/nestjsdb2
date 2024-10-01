// src/factories/db2-factory.ts

import { IFactory } from '../interfaces/factory.interface';
import { Connection } from './Connection';
import { AuthStrategy } from '../auth';
import { Logger } from '../utils';
import { Pool } from './pool';

/**
 * Factory class to create and destroy connections.
 * This class is responsible for creating and destroying connections.
 * It uses the AuthStrategy to get the connection string and create a new connection.
 * @implements IFactory<Connection>
 * @class
 * @public
 * @property {AuthStrategy} authStrategy - Authentication strategy.
 * @property {Pool<Connection>} pool - The connection pool.
 * @method {create} - Create a new connection.
 * @method {destroy} - Destroy the connection.
 * @constructor
 * @param {AuthStrategy} authStrategy - Authentication strategy.
 * @returns {Factory} - Factory instance.
 * @example
 * ```typescript
 * const config: IConfigOptions = {
 *  host: 'localhost',
 *  port: 50000,
 *  database: 'sample',
 *  auth: {
 *   authType: 'user',
 *   user: 'db
 *   password: 'password'
 *  }
 * };
 *
 * const authStrategy = new UserAuthStrategy(config);
 * const factory = new Factory(authStrategy);
 * const connection = await factory.create();
 * ```
 */
export class Factory implements IFactory<Connection> {
  private readonly logger = new Logger(Factory.name);
  private authStrategy: AuthStrategy;
  pool: Pool<Connection>;

  constructor(authStrategy: AuthStrategy) {
    this.authStrategy = authStrategy;
  }

  /**
   * Create a new connection.
   * @returns {Promise<Connection>} - Connection instance.
   * @public
   * @async
   * @method
   * @example
   * ```typescript
   * const connection = await factory.create();
   * ```
   */
  public async create(): Promise<Connection> {
    const connectionString = this.authStrategy.getConnectionString();
    this.logger.debug(
      `Attempting to connect with connection string: ${connectionString}`,
    );
    return new Promise<Connection>(async (resolve, reject) => {
      try {
        const connection = new Connection(connectionString);
        await connection.open();
        this.logger.info('Connection established.');
        resolve(connection);
      } catch (error) {
        this.logger.error('Error connecting to database:', error);
        reject(error);
      }
    });
  }

  /**
   * Destroy the connection.
   * @param {Connection} connection - Connection instance.
   * @returns {Promise<void>} - A Promise that resolves when the connection is destroyed.
   * @public
   * @async
   * @method
   * @example
   * ```typescript
   * await factory.destroy(connection);
   * ```
   * @throws {Error} - Throws an error if the connection is not valid.

   */
  public async destroy(connection: Connection): Promise<void> {
    try {
      if (!connection) {
        throw new Error('Connection is not valid.');
      }
      await connection.close();
      this.logger.info('Connection closed.');
    } catch (error) {
      this.logger.error('Error closing connection:', error);
      throw error;
    }
  }
}
