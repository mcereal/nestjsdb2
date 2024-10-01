import { Connection } from './Connection';
import {
  IConfigOptions,
  IFactory,
  IPoolManager,
  IPoolOptions,
} from '../interfaces';
import { Pool } from './pool';
import { AuthStrategy } from '../auth';
import { Logger } from '../utils';
import { Factory } from './factory';

/**
 * PoolManager class to manage the connection pool.
 * This class is responsible for initializing the connection pool, acquiring and releasing connections.
 * It also provides methods to close the connection pool and release all resources.
 * @implements IPoolManager
 * @class
 * @public
 * @property {Pool<Connection>} pool - The connection pool.
 * @property {boolean} poolInitialized - Flag to indicate if the connection pool is initialized.
 * @property {Logger} logger - Logger instance.
 * @property {IConfigOptions} config - Configuration options.
 * @property {AuthStrategy} authStrategy - Authentication strategy.
 * @method {init} - Initialize the connection pool.
 * @method {setAuthStrategy} - Set the authentication strategy.
 * @method {validateConfig} - Validate the configuration options.
 * @method {getPool} - Get the connection pool.
 * @method {isPoolInitialized} - Check if the connection pool is initialized.
 * @method {getConnection} - Acquire a connection from the pool.
 * @method {closeConnection} - Close a connection and release it back to the pool.
 * @method {drainPool} - Drain the connection pool and release all resources.
 * @method {releaseConnection} - Release a connection back to the pool.
 * @constructor
 * @param {IConfigOptions} config - Configuration options.
 * @param {AuthStrategy} authStrategy - Authentication strategy.
 * @returns {PoolManager} - PoolManager instance.
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
 * const poolManager = new PoolManager(config, authStrategy);
 * poolManager.init();
 */
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
   * @public
   * @async
   * @method
   * @returns {Promise<void>} - A Promise that resolves when the connection pool is initialized.
   * @throws {Error} - Throws an error if the connection pool is already initialized.
   * @example
   * ```typescript
   * await poolManager.init();
   * ```
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

  /**
   * Set the authentication strategy.
   * @public
   * @method
   * @param {AuthStrategy} authStrategy - The authentication strategy.
   * @returns {void}
   * @example
   * ```typescript
   * poolManager.setAuthStrategy(authStrategy);
   * ```
   */
  public setAuthStrategy(authStrategy: AuthStrategy): void {
    this.authStrategy = authStrategy;
  }

  /**
   * Validate the configuration options.
   * @private
   * @method
   * @param {IConfigOptions} config - Configuration options.
   * @returns {void}
   * @throws {Error} - Throws an error if the configuration is invalid.
   * @example
   * ```typescript
   * this.validateConfig(config);
   * ```
   */
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

  /**
   * Get the connection pool.
   * @public
   * @method
   * @returns {Pool<Connection>} - The connection pool.
   * @throws {Error} - Throws an error if the connection pool is not initialized.
   * @example
   * ```typescript
   * const pool = poolManager.getPool;
   * ```
   */
  public get getPool(): Pool<Connection> {
    if (!this.poolInitialized || !this.pool) {
      this.logger.error('DB2 connection pool is not initialized.');
      throw new Error('DB2 connection pool is not initialized.');
    }
    this.logger.info('DB2 connection pool already initialized.');
    return this.pool;
  }

  /**
   * Check if the connection pool is initialized.
   * @public
   * @method
   * @returns {boolean} - A boolean indicating if the connection pool is initialized.
   * @example
   * ```typescript
   * const isInitialized = poolManager.isPoolInitialized;
   * ```
   */
  public get isPoolInitialized(): boolean {
    return this.poolInitialized;
  }

  /**
   * Acquire a connection from the pool.
   * @public
   * @async
   * @method
   * @returns {Promise<Connection>} - A Promise that resolves with the acquired connection.
   * @throws {Error} - Throws an error if the connection pool is not initialized.
   * @example
   * ```typescript
   * const connection = await poolManager.getConnection();
   * ```
   */
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

  /**
   * Close a connection and release it back to the pool.
   * @public
   * @async
   * @method
   * @param {Connection} connection - The connection to close.
   * @returns {Promise<void>} - A Promise that resolves when the connection is closed.
   * @throws {Error} - Throws an error if the connection pool is not initialized.
   * @example
   * ```typescript
   * await poolManager.closeConnection(connection);
   * ```
   */
  public async closeConnection(connection: Connection): Promise<void> {
    if (this.poolInitialized) {
      await this.pool.release(connection);
      this.logger.info('Connection closed.');
    }
  }

  /**
   * Drain the connection pool and release all resources.
   * @public
   * @async
   * @method
   * @returns {Promise<void>} - A Promise that resolves when the connection pool is drained.
   * @throws {Error} - Throws an error if the connection pool is not initialized.
   * @example
   * ```typescript
   * await poolManager.drainPool();
   * ```
   */
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
