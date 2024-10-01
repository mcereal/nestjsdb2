// src/factories/db2-factory.ts

import { IFactory } from '../interfaces/factory.interface';
import { Connection } from 'ibm_db';
import * as ibm_db from 'ibm_db';
import { AuthStrategy } from '../auth';
import { Logger } from '../utils';

export class Factory implements IFactory<Connection> {
  private readonly logger = new Logger(Factory.name);
  private ibm_db: typeof ibm_db;
  private authStrategy: AuthStrategy;

  constructor(ibm_db_instance: typeof ibm_db, authStrategy: AuthStrategy) {
    this.ibm_db = ibm_db_instance;
    this.authStrategy = authStrategy;
  }

  public async create(): Promise<Connection> {
    const connectionString = this.authStrategy.getConnectionString();
    this.logger.debug(
      `Attempting to connect with connection string: ${connectionString}`,
    );
    return new Promise<Connection>((resolve, reject) => {
      this.ibm_db.open(connectionString, (err, connection) => {
        if (err) {
          this.logger.error('Error opening connection', err.message);
          reject(err);
        } else {
          this.logger.info('Connection successfully established');
          resolve(connection);
        }
      });
    });
  }

  public async destroy(connection: Connection): Promise<void> {
    await connection.close();
    this.logger.info('Connection closed.');
  }
}
