import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  Optional,
} from '@nestjs/common';
import {
  Db2ClientState,
  IDb2ConfigOptions,
  Db2HealthDetails,
  IDb2Service,
  IDb2Client,
  ITransactionManager,
  IDb2MigrationService,
  IPoolManager,
} from '../interfaces';
import { handleDb2Error } from '../errors/db2.error';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { IConnectionManager } from '../interfaces';
import {
  I_CONNECTION_MANAGER,
  I_DB2_CLIENT,
  I_DB2_CONFIG,
  I_DB2_MIGRATION_SERVICE,
  I_POOL_MANAGER,
  I_TRANSACTION_MANAGER,
} from '../constants/injection-token.constant';
import { Db2ConnectionState } from '../enums';
import { Logger } from '../utils';

@Injectable()
export class Db2Service implements IDb2Service, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(Db2Service.name);
  private cache?: Cache;

  constructor(
    @Inject(I_DB2_CONFIG) private readonly options: IDb2ConfigOptions,
    @Optional() @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(I_TRANSACTION_MANAGER)
    private readonly transactionManager: ITransactionManager,
    @Inject(I_DB2_MIGRATION_SERVICE)
    private readonly migrationService: IDb2MigrationService,
    @Inject(I_CONNECTION_MANAGER)
    private readonly connectionManager: IConnectionManager,
    @Inject(I_POOL_MANAGER) private readonly poolManager: IPoolManager,
    @Inject(I_DB2_CLIENT)
    private readonly client: IDb2Client,
  ) {
    if (this.options.cache?.enabled && this.cacheManager) {
      this.cache = this.cacheManager;
      this.logger.info('Cache manager initialized.');
    } else {
      this.logger.info('Caching is disabled.');
    }
  }

  // Lifecycle Hooks

  public async onModuleInit(): Promise<void> {
    this.logger.info('Initializing Db2Service...');

    // Wait for the pool to be initialized
    while (!this.poolManager.isPoolInitialized) {
      this.logger.info('Waiting for the connection pool to be initialized...');
      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait 100ms
    }

    // Validate configuration
    this.validateConfig(this.options);
    this.logger.info('Configuration validated.');

    try {
      // Connect to DB2
      this.logger.info('Connecting to DB2...');
      await this.connect();
      this.logger.info('Connected to DB2 successfully.');

      // Run migrations if enabled
      if (this.options.migration?.enabled) {
        this.logger.info('Migrations are enabled. Running migrations...');
        await this.migrationService.runMigrations();
        this.logger.info('Migrations completed successfully.');
      } else {
        this.logger.info('Migrations are disabled. Skipping migration step.');
      }

      // Set state to CONNECTED
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.CONNECTED,
      });

      this.logger.info('Db2Service initialization complete.');
    } catch (error) {
      // Set state to ERROR on failure
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.ERROR,
      });

      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, 'Module Initialization', options, this.logger);
      throw error;
    }
  }

  public async onModuleDestroy(): Promise<void> {
    this.logger.info('Destroying Db2Service...');

    // Set state to DISCONNECTING
    this.connectionManager.setState({
      connectionState: Db2ConnectionState.DISCONNECTING,
    });

    try {
      await this.drainPool();
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(
        error,
        'Drain Pool during Module Destroy',
        options,
        this.logger,
      );
    }

    try {
      await this.disconnect();
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(
        error,
        'Disconnect during Module Destroy',
        options,
        this.logger,
      );
    }

    if (this.cache) {
      try {
        if (this.options.cache?.resetOnDestroy) {
          await this.cache.reset();
          this.logger.info('Cache reset successfully.');
        }

        const cacheStore = this.cache.store as any;
        if (typeof cacheStore?.disconnect === 'function') {
          await cacheStore.disconnect();
          this.logger.info('Cache store connection closed.');
        } else if (
          typeof cacheStore?.getClient === 'function' &&
          typeof cacheStore.getClient()?.disconnect === 'function'
        ) {
          await cacheStore.getClient().disconnect();
          this.logger.info('Cache store client connection closed.');
        }
      } catch (error) {
        const options = {
          host: this.options.host,
          database: this.options.database,
        };
        handleDb2Error(
          error,
          'Cache Cleanup during Module Destroy',
          options,
          this.logger,
        );
      }
    }

    // Set state to DISCONNECTED
    this.connectionManager.setState({
      connectionState: Db2ConnectionState.DISCONNECTED,
    });
  }

  // Connection Management
  public async connect(): Promise<void> {
    const currentState = this.connectionManager.getState().connectionState;
    if (currentState === Db2ConnectionState.CONNECTED) {
      this.logger.info('Already connected. Skipping connect.');
      return;
    }

    try {
      // Set state to CONNECTING
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.CONNECTING,
      });

      await this.connectionManager.getConnection(); // Now this should succeed
      this.logger.info('Db2Service connected successfully.');

      // Set state to CONNECTED on successful connection
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.CONNECTED,
      });
    } catch (error) {
      // Set state to ERROR on connection failure
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.ERROR,
      });

      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, 'Connection', options, this.logger);
      throw error; // Rethrow to handle upstream
    }
  }

  public async disconnect(): Promise<void> {
    try {
      // Set state to DISCONNECTING
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.DISCONNECTING,
      });

      await this.connectionManager.disconnect(); // Delegate to connectionManager
      this.logger.info('Db2Service disconnected successfully.');

      // Set state to DISCONNECTED
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.DISCONNECTED,
      });
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, 'Disconnection', options, this.logger);
      throw error; // Rethrow to handle upstream
    }
  }

  public async drainPool(): Promise<void> {
    try {
      // Set state to POOL_DRAINING
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.POOL_DRAINING,
      });

      await this.connectionManager.drainPool(); // Delegate to connectionManager
      this.logger.info('Db2Service drained the connection pool successfully.');

      // Set state to POOL_DRAINED
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.POOL_DRAINED,
      });
    } catch (error) {
      // Set state to ERROR if draining fails
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.ERROR,
      });

      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, 'Drain Pool', options, this.logger);
      throw error; // Rethrow to handle upstream
    }
  }

  public getState(): Db2ClientState {
    return this.connectionManager.getState();
  }

  public getActiveConnectionsCount(): number {
    return this.connectionManager.getActiveConnectionsCount();
  }

  /**
   * Clear the cache for a specific query.
   */
  public async clearCache(sql: string, params: any[] = []): Promise<boolean> {
    if (this.cache) {
      try {
        const cacheKey = this.generateCacheKey(sql, params);
        await this.cache.del(cacheKey);
        this.logger.info(`Cache cleared for query: ${sql}`);
        return true;
      } catch (error) {
        const options = {
          host: this.options.host,
          database: this.options.database,
        };
        handleDb2Error(error, 'Cache Clear', options, this.logger);
        return false;
      }
    }
    return false;
  }

  /**
   * Generate a unique cache key based on the SQL query and parameters.
   */
  private generateCacheKey(sql: string, params: Record<string, any>): string {
    const paramsKey = params.map((p) => JSON.stringify(p)).join(':');
    return `${sql}:${paramsKey}`;
  }

  /**
   * Perform a health check on the DB2 service.
   */
  public async checkHealth(): Promise<{
    dbHealth: boolean;
    transactionActive: boolean;
    details?: Db2HealthDetails;
    error?: string; // Add error at the top level
  }> {
    this.logger.info('Performing service-level health check...');

    try {
      // Get the full health check details from the client
      const dbHealthDetails = await this.client.checkHealth();

      // Extract the boolean dbHealth status
      const dbHealth = dbHealthDetails.status;

      // Check if a transaction is currently active
      const transactionActive =
        this.transactionManager?.isTransactionActive?.() ?? false;

      return {
        dbHealth, // Boolean health status
        transactionActive, // Transaction activity status
        details: dbHealthDetails.details || undefined, // Set details to undefined if not present
      };
    } catch (error) {
      this.logger.error('DB2 health check failed:', error.message);
      // Return error status and undefined details
      return {
        dbHealth: false,
        transactionActive: false,
        details: undefined, // Set details to undefined in case of an error
        error: error.message, // Move the error to the top level
      };
    }
  }

  /**
   * Log details of a SQL query.
   */
  private logQueryDetails(
    sql: string,
    params: Record<string, any>,
    duration: number,
    error?: any,
  ): void {
    const logMessage = {
      query: sql,
      params: params,
      duration: `${duration} ms`,
      error: error ? error.message : null,
    };

    this.logger.info(JSON.stringify(logMessage));
  }

  /**
   * Execute a SQL query with optional caching and timeout.
   */
  public async query<T>(
    sql: string,
    params: Record<string, any>,
    timeout?: number,
  ): Promise<T> {
    const start = Date.now();

    // Check for cached result
    if (this.cache) {
      const cacheKey = this.generateCacheKey(sql, params);
      const cachedResult = await this.cache.get<T>(cacheKey);
      if (cachedResult) {
        this.logger.info(`Cache hit for query: ${sql}`);
        return cachedResult;
      }
    }

    // Execute the query via the Db2Client
    try {
      const result = (await this.client.query(sql, params, timeout)) as T; // Pass timeout

      // Cache the result if needed
      if (this.cache) {
        const cacheKey = this.generateCacheKey(sql, params);
        await this.cache.set(cacheKey, result);
        this.logger.info(`Cache set for query: ${sql}`);
      }

      const duration = Date.now() - start;

      // Log query details if logging is enabled
      if (
        this.options.logging?.logQueries ||
        this.options.logging?.profileSql
      ) {
        this.logQueryDetails(sql, params, duration); // Log query details
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      if (this.options.logging?.logErrors || this.options.logging?.profileSql) {
        this.logQueryDetails(sql, params, duration, error);
      }
      const options = {
        host: this.options.host,
        database: this.options.database,
      };

      handleDb2Error(error, 'Execute Query', options, this.logger);
      throw error; // Ensure the error is propagated
    }
  }

  /**
   * Execute a prepared statement.
   */
  public async executePreparedStatement<T>(
    sql: string,
    params: any[] = [],
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = (await this.client.executePreparedStatement(
        sql,
        params,
      )) as T;

      const duration = Date.now() - start;

      if (
        this.options.logging?.logQueries ||
        this.options.logging?.profileSql
      ) {
        this.logQueryDetails(sql, params, duration);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;

      if (this.options.logging?.logErrors || this.options.logging?.profileSql) {
        this.logQueryDetails(sql, params, duration, error);
      }
      const options = {
        host: this.options.host,
        database: this.options.database,
      };

      handleDb2Error(error, 'Execute Prepared Statement', options, this.logger);
      throw error; // Ensure the error is propagated
    }
  }

  /**
   * Perform a batch insert operation.
   */
  public async batchInsert(
    tableName: string,
    columns: string[],
    valuesArray: any[][],
  ): Promise<void> {
    const start = Date.now();
    try {
      await this.client.batchInsert(tableName, columns, valuesArray);

      const duration = Date.now() - start;
      if (
        this.options.logging?.logQueries ||
        this.options.logging?.profileSql
      ) {
        this.logQueryDetails('Batch Insert Operation', valuesArray, duration);
      }
    } catch (error) {
      const duration = Date.now() - start;
      if (this.options.logging?.logErrors || this.options.logging?.profileSql) {
        this.logQueryDetails(
          'Batch Insert Operation',
          valuesArray,
          duration,
          error,
        );
      }
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, 'Batch Insert', options, this.logger);
      throw error; // Ensure the error is propagated
    }
  }

  /**
   * Perform a batch update operation.
   */
  public async batchUpdate(
    tableName: string,
    columns: string[],
    valuesArray: any[][],
    whereClause: string,
  ): Promise<void> {
    const start = Date.now();
    try {
      await this.client.batchUpdate(
        tableName,
        columns,
        valuesArray,
        whereClause,
      );

      const duration = Date.now() - start; // Calculate execution duration
      if (
        this.options.logging?.logQueries ||
        this.options.logging?.profileSql
      ) {
        this.logQueryDetails('Batch Update Operation', valuesArray, duration);
      }
    } catch (error) {
      const duration = Date.now() - start; // Calculate execution duration
      if (this.options.logging?.logErrors || this.options.logging?.profileSql) {
        this.logQueryDetails(
          'Batch Update Operation',
          valuesArray,
          duration,
          error,
        );
      }
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, 'Batch Update', options, this.logger);
      throw error; // Ensure the error is propagated
    }
  }

  /**
   * Begin a database transaction.
   */
  public async beginTransaction(): Promise<void> {
    try {
      await this.transactionManager.beginTransaction();
      this.logger.info('Transaction started.');
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, 'Begin Transaction', options, this.logger);
      throw error; // Ensure the error is propagated
    }
  }

  /**
   * Commit a database transaction.
   */
  public async commitTransaction(): Promise<void> {
    try {
      await this.transactionManager.commitTransaction();
      this.logger.info('Transaction committed.');
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, 'Commit Transaction', options, this.logger);
      throw error; // Ensure the error is propagated
    }
  }

  /**
   * Rollback a database transaction.
   */
  public async rollbackTransaction(): Promise<void> {
    try {
      await this.transactionManager.rollbackTransaction();
      this.logger.info('Transaction rolled back.');
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, 'Rollback Transaction', options, this.logger);
      throw error; // Ensure the error is propagated
    }
  }

  /**
   * Run a migration script.
   */
  public async runMigration(script: string): Promise<void> {
    try {
      await this.query(script, {}); // Use the existing query method with empty params
      this.logger.info('Migration script executed successfully.');
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, 'Migration Execution', options, this.logger);
      throw error; // Ensure the error is propagated
    }
  }

  /**
   * Validate the configuration options.
   */
  private validateConfig(options: IDb2ConfigOptions): void {
    if (!options.host || !options.port || !options.auth || !options.database) {
      throw new Error(
        'Invalid configuration: Host, port, username, password, and database are required.',
      );
    }
    if (options.useTls && !options.sslCertificatePath) {
      throw new Error(
        'TLS is enabled, but no SSL certificate path is provided.',
      );
    }
    if (options.auth.authType === 'jwt' && !options.auth) {
      throw new Error('JWT authentication requires a valid JWT token.');
    }
    if (options.auth.authType === 'kerberos' && !options.auth) {
      throw new Error('Kerberos authentication requires a service name.');
    }
  }
}
