// src/factories/db2-factory.ts

import { IFactory } from '../interfaces/factory.interface';
import { Connection } from './Connection';
import { AuthStrategy } from '../auth';
import { Logger } from '../utils';
import { Pool } from './Pool';

export class Factory implements IFactory<Connection> {
  private readonly logger = new Logger(Factory.name);
  private authStrategy: AuthStrategy;
  pool: Pool<Connection>;

  constructor(authStrategy: AuthStrategy) {
    this.authStrategy = authStrategy;
  }

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

  public async destroy(connection: Connection): Promise<void> {
    await connection.close();
    this.logger.info('Connection closed.');
  }
}
