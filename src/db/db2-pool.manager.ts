import { Connection } from 'ibm_db';
import { IDb2ConfigOptions, IPoolManager } from '../interfaces';
import * as ibm_db from 'ibm_db';
import { Pool, Factory, createPool } from 'generic-pool';
import { Db2AuthStrategy } from '../auth';
import { Logger } from '../utils';

export class Db2PoolManager implements IPoolManager {
  private readonly logger = new Logger(Db2PoolManager.name);
  private pool: Pool<Connection>;
  private poolInitialized = false;
  private ibm_db: typeof ibm_db;
  private authStrategy: Db2AuthStrategy;
  private config: IDb2ConfigOptions;

  public constructor(config: IDb2ConfigOptions, authStrategy: Db2AuthStrategy) {
    this.config = config;
    this.authStrategy = authStrategy;
    this.ibm_db = ibm_db;
  }

  /**
   * Initialize the connection pool. Should be called manually after instantiation.
   */
  public async init(): Promise<void> {
    if (this.poolInitialized) {
      this.logger.info('Connection pool is already initialized.');
      return;
    }

    this.logger.info('Initializing Db2PoolManager...');
    this.validateConfig(this.config);

    // Authenticate before creating the pool
    await this.authStrategy.authenticate();

    const factory: Factory<Connection> = {
      create: async () => {
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
      },
      destroy: async (connection: Connection) => {
        await connection.close();
        this.logger.info('Connection closed.');
      },
    };

    try {
      this.pool = createPool(factory, {
        max: this.config.maxPoolSize || 10,
        min: this.config.minPoolSize || 2,
        acquireTimeoutMillis: this.config.acquireTimeoutMillis || 30000,
      });
      this.poolInitialized = true;
      this.logger.info('Connection pool initialized successfully.');
    } catch (error) {
      this.logger.error(
        'Error during pool initialization:',
        (error as Error).message,
      );
      throw error;
    }
  }

  public setAuthStrategy(authStrategy: Db2AuthStrategy): void {
    this.authStrategy = authStrategy;
  }

  private validateConfig(config: IDb2ConfigOptions): void {
    if (!config) {
      this.logger.error('Configuration is null or undefined.');
      throw new Error('Invalid configuration: Config object is missing.');
    }

    if (!config.host || !config.port || !config.auth || !config.database) {
      this.logger.debug(`Configuration: ${JSON.stringify(config)}`);
      throw new Error(
        'Invalid configuration: Host, port, auth, and database are required.',
      );
    }
    if (config.useTls && !config.sslCertificatePath) {
      throw new Error(
        'TLS is enabled, but no SSL certificate path is provided.',
      );
    }
    if (
      config.auth.authType === 'jwt' &&
      'jwtToken' in config.auth &&
      !config.auth.jwtToken
    ) {
      throw new Error('JWT authentication requires a valid JWT token.');
    }
    if (
      config.auth.authType === 'kerberos' &&
      'krbServiceName' in config.auth &&
      !config.auth.krbServiceName
    ) {
      throw new Error('Kerberos authentication requires a service name.');
    }
  }

  public get getPool(): Pool<Connection> {
    if (!this.poolInitialized || !this.pool) {
      this.logger.error('DB2 connection pool is not initialized.');
      throw new Error('DB2 connection pool is not initialized.');
    }
    this.logger.info('DB2 connection pool already initialized.');
    return this.pool;
  }

  public get isPoolInitialized(): boolean {
    return this.poolInitialized;
  }

  public async getConnection(): Promise<Connection> {
    if (!this.poolInitialized || !this.pool) {
      this.logger.error('DB2 connection pool is not initialized.');
      throw new Error('DB2 connection pool is not initialized.');
    }

    try {
      this.logger.info('Acquiring connection from pool...');
      const connection = await Promise.race([
        this.pool.acquire(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Connection acquisition timeout')),
            10000,
          ),
        ), // 10 seconds
      ]);
      this.logger.info('Connection acquired from pool.');
      return connection;
    } catch (error) {
      this.logger.error(
        'Failed to acquire connection from pool.',
        (error as Error).message,
      );
      throw error;
    }
  }

  public async closeConnection(connection: Connection): Promise<void> {
    if (this.poolInitialized) {
      await this.pool.release(connection);
      this.logger.info('Connection released back to pool.');
    }
  }

  public async drainPool(): Promise<void> {
    try {
      await this.pool.drain();
      await this.pool.clear();
      this.poolInitialized = false;
      this.logger.info('Connection pool drained and cleared.');
    } catch (error) {
      this.logger.error('Failed to drain connection pool.', error.message);
      throw error;
    }
  }

  public async releaseConnection(connection: Connection): Promise<void> {
    if (this.poolInitialized) {
      await this.pool.release(connection);
      this.logger.info('Connection released back to custom pool.');
    }
  }
}
