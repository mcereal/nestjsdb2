import { Connection } from './Connection';
import {
  IConfigOptions,
  IFactory,
  IPoolManager,
  IPoolOptions,
} from '../interfaces';
import { Pool } from './Pool';
import { AuthStrategy } from '../auth';
import { Logger } from '../utils';
import { Factory } from './factory';

export class PoolManager implements IPoolManager {
  private readonly logger = new Logger(PoolManager.name);
  private pool: Pool<Connection>;
  private poolInitialized = false;

  constructor(
    private config: IConfigOptions,
    private authStrategy: AuthStrategy,
  ) {}

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

    const factory: IFactory<Connection> = new Factory(this.authStrategy);

    const poolOptions: IPoolOptions = {
      maxPoolSize: this.config.poolOptions.maxPoolSize || 10,
      minPoolSize: this.config.poolOptions.minPoolSize || 2,
      acquireTimeoutMillis:
        this.config.poolOptions.acquireTimeoutMillis || 30000,
      idleTimeoutMillis: this.config.poolOptions.idleTimeoutMillis || 30000,
      maxWaitingClients: this.config.poolOptions.maxPoolSize
        ? this.config.poolOptions.maxPoolSize * 2
        : 20,
    };

    this.pool = new Pool<Connection>(factory, poolOptions);

    // Optional: Add event listeners for logging
    this.pool.on('createSuccess', (resource) =>
      this.logger.debug('Resource created successfully.'),
    );
    this.pool.on('createError', (error) =>
      this.logger.error('Error creating resource:', error),
    );
    this.pool.on('acquire', (resource) =>
      this.logger.debug('Resource acquired.'),
    );
    this.pool.on('release', (resource) =>
      this.logger.debug('Resource released.'),
    );
    this.pool.on('destroy', (resource) =>
      this.logger.debug('Resource destroyed.'),
    );
    this.pool.on('destroyError', (error) =>
      this.logger.error('Error destroying resource:', error),
    );

    this.poolInitialized = true;
    this.logger.info('Connection pool initialized successfully.');
  }

  public setAuthStrategy(authStrategy: AuthStrategy): void {
    this.authStrategy = authStrategy;
  }

  private validateConfig(config: IConfigOptions): void {
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
      this.logger.info('Connection closed.');
    }
  }

  public async drainPool(): Promise<void> {
    try {
      await this.pool.drain();
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
      this.logger.info('Connection released back to pool.');
    }
  }
}
