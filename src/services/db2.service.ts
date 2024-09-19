import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  Optional,
} from "@nestjs/common";
import {
  Db2CacheOptions,
  Db2ClientState,
  IDb2ConfigOptions,
  Db2HealthDetails,
  Db2ServiceInterface,
  IDb2Client,
} from "../interfaces";
import { Db2QueryBuilder } from "../db";
import { handleDb2Error } from "../errors/db2.error";
import { Cache, caching } from "cache-manager";
import { Db2MigrationService } from "../services";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { IConnectionManager } from "../interfaces";
import { TransactionManager } from "../db/transaction-manager";
import { redisStore } from "cache-manager-redis-yet";
import { DB2_CONFIG } from "../constants/injection-token.constant";

@Injectable()
export class Db2Service
  implements Db2ServiceInterface, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(Db2Service.name);
  private cache?: Cache;
  private client: IDb2Client;

  constructor(
    @Inject(DB2_CONFIG) private readonly options: IDb2ConfigOptions,
    @Optional() @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly transactionManager: TransactionManager,
    private readonly migrationService: Db2MigrationService,
    private readonly connectionManager: IConnectionManager,
    db2Client: IDb2Client
  ) {
    // Initialize cache if enabled
    if (this.options.cache?.enabled && this.cacheManager) {
      this.cache = this.cacheManager;
      this.logger.log("Cache manager initialized.");
      this.initializeCache(this.options.cache);
    } else {
      this.logger.log("Caching is disabled.");
    }

    this.client = db2Client;
  }

  // Lifecycle Hooks

  public async onModuleInit(): Promise<void> {
    this.logger.log("Initializing Db2Service...");

    // Validate configuration
    this.validateConfig(this.options);
    this.logger.log("Configuration validated.");

    try {
      // Connect to DB2
      this.logger.log("Connecting to DB2...");
      await this.connect();
      this.logger.log("Connected to DB2 successfully.");

      // Run migrations if enabled
      if (this.options.migration?.enabled) {
        this.logger.log("Migrations are enabled. Running migrations...");
        await this.migrationService.runMigrations();
        this.logger.log("Migrations completed successfully.");
      } else {
        this.logger.log("Migrations are disabled. Skipping migration step.");
      }

      this.logger.log("Db2Service initialization complete.");
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, "Module Initialization", options, this.logger);
      throw error;
    }
  }

  public async onModuleDestroy(): Promise<void> {
    this.logger.log("Destroying Db2Service...");
    try {
      await this.drainPool();
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(
        error,
        "Drain Pool during Module Destroy",
        options,
        this.logger
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
        "Disconnect during Module Destroy",
        options,
        this.logger
      );
    }

    if (this.cache) {
      try {
        if (this.options.cache?.resetOnDestroy) {
          await this.cache.reset();
          this.logger.log("Cache reset successfully.");
        }

        const cacheStore = this.cache.store as any;
        if (typeof cacheStore.disconnect === "function") {
          await cacheStore.disconnect();
          this.logger.log("Cache store connection closed.");
        }
      } catch (error) {
        const options = {
          host: this.options.host,
          database: this.options.database,
        };
        handleDb2Error(
          error,
          "Cache Cleanup during Module Destroy",
          options,
          this.logger
        );
      }
    }
  }

  // Connection Management
  public async connect(): Promise<void> {
    try {
      // At this point, Db2Client should have set the connectionState to CONNECTED
      await this.connectionManager.getConnection(); // Now this should succeed
      this.logger.log("Db2Service connected successfully.");
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, "Connection", options, this.logger);
      throw error; // Rethrow to handle upstream
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.connectionManager.disconnect(); // Delegate to connectionManager
      this.logger.log("Db2Service disconnected successfully.");
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, "Disconnection", options, this.logger);
      throw error; // Rethrow to handle upstream
    }
  }

  public async drainPool(): Promise<void> {
    try {
      await this.connectionManager.drainPool(); // Delegate to connectionManager
      this.logger.log("Db2Service drained the connection pool successfully.");
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, "Drain Pool", options, this.logger);
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
   * Initialize the cache based on the provided cache options.
   */
  private async initializeCache(cacheOptions: Db2CacheOptions): Promise<void> {
    if (cacheOptions.store === "redis") {
      this.cache = await caching(redisStore, {
        host: cacheOptions.redisHost,
        port: cacheOptions.redisPort,
        password: cacheOptions.redisPassword,
        ttl: cacheOptions.ttl || 600, // Default to 10 minutes if not set
      });
      this.logger.log("Redis cache initialized.");
    } else {
      // Default to in-memory cache
      this.cache = await caching("memory", {
        max: cacheOptions.max || 100, // Default max items
        ttl: cacheOptions.ttl || 600, // Default to 10 minutes if not set
      });
      this.logger.log("In-memory cache initialized.");
    }
  }

  /**
   * Clear the cache for a specific query.
   */
  public async clearCache(sql: string, params: any[] = []): Promise<boolean> {
    if (this.cache) {
      try {
        const cacheKey = this.generateCacheKey(sql, params);
        await this.cache.del(cacheKey);
        this.logger.log(`Cache cleared for query: ${sql}`);
        return true;
      } catch (error) {
        const options = {
          host: this.options.host,
          database: this.options.database,
        };
        handleDb2Error(error, "Cache Clear", options, this.logger);
        return false;
      }
    }
    return false;
  }

  /**
   * Generate a unique cache key based on the SQL query and parameters.
   */
  private generateCacheKey(sql: string, params: any[]): string {
    const paramsKey = params.map((p) => JSON.stringify(p)).join(":");
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
    this.logger.log("Performing service-level health check...");

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
      this.logger.error("DB2 health check failed:", error.message);
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
    params: any[],
    duration: number,
    error?: any
  ): void {
    const logMessage = {
      query: sql,
      params: params,
      duration: `${duration} ms`,
      error: error ? error.message : null,
    };

    this.logger.log(JSON.stringify(logMessage));
  }

  /**
   * Execute a SQL query with optional caching and timeout.
   */
  public async query<T>(
    sql: string,
    params: any[] = [],
    timeout?: number
  ): Promise<T> {
    const start = Date.now();

    // Check for cached result
    if (this.cache) {
      const cacheKey = this.generateCacheKey(sql, params);
      const cachedResult = await this.cache.get<T>(cacheKey);
      if (cachedResult) {
        this.logger.log(`Cache hit for query: ${sql}`);
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
        this.logger.log(`Cache set for query: ${sql}`);
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

      handleDb2Error(error, "Execute Query", options, this.logger);
      throw error; // Ensure the error is propagated
    }
  }

  /**
   * Execute a prepared statement.
   */
  public async executePreparedStatement<T>(
    sql: string,
    params: any[] = []
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = (await this.client.executePreparedStatement(
        sql,
        params
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

      handleDb2Error(error, "Execute Prepared Statement", options, this.logger);
      throw error; // Ensure the error is propagated
    }
  }

  /**
   * Perform a batch insert operation.
   */
  public async batchInsert(
    tableName: string,
    columns: string[],
    valuesArray: any[][]
  ): Promise<void> {
    const start = Date.now();
    try {
      await this.client.batchInsert(tableName, columns, valuesArray);

      const duration = Date.now() - start;
      if (
        this.options.logging?.logQueries ||
        this.options.logging?.profileSql
      ) {
        this.logQueryDetails("Batch Insert Operation", valuesArray, duration);
      }
    } catch (error) {
      const duration = Date.now() - start;
      if (this.options.logging?.logErrors || this.options.logging?.profileSql) {
        this.logQueryDetails(
          "Batch Insert Operation",
          valuesArray,
          duration,
          error
        );
      }
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, "Batch Insert", options, this.logger);
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
    whereClause: string
  ): Promise<void> {
    const start = Date.now();
    try {
      await this.client.batchUpdate(
        tableName,
        columns,
        valuesArray,
        whereClause
      );

      const duration = Date.now() - start; // Calculate execution duration
      if (
        this.options.logging?.logQueries ||
        this.options.logging?.profileSql
      ) {
        this.logQueryDetails("Batch Update Operation", valuesArray, duration);
      }
    } catch (error) {
      const duration = Date.now() - start; // Calculate execution duration
      if (this.options.logging?.logErrors || this.options.logging?.profileSql) {
        this.logQueryDetails(
          "Batch Update Operation",
          valuesArray,
          duration,
          error
        );
      }
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, "Batch Update", options, this.logger);
      throw error; // Ensure the error is propagated
    }
  }

  /**
   * Begin a database transaction.
   */
  public async beginTransaction(): Promise<void> {
    try {
      await this.transactionManager.beginTransaction();
      this.logger.log("Transaction started.");
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, "Begin Transaction", options, this.logger);
      throw error; // Ensure the error is propagated
    }
  }

  /**
   * Commit a database transaction.
   */
  public async commitTransaction(): Promise<void> {
    try {
      await this.transactionManager.commitTransaction();
      this.logger.log("Transaction committed.");
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, "Commit Transaction", options, this.logger);
      throw error; // Ensure the error is propagated
    }
  }

  /**
   * Rollback a database transaction.
   */
  public async rollbackTransaction(): Promise<void> {
    try {
      await this.transactionManager.rollbackTransaction();
      this.logger.log("Transaction rolled back.");
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, "Rollback Transaction", options, this.logger);
      throw error; // Ensure the error is propagated
    }
  }

  /**
   * Run a migration script.
   */
  public async runMigration(script: string): Promise<void> {
    try {
      await this.query(script); // Use the existing query method
      this.logger.log("Migration script executed successfully.");
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, "Migration Execution", options, this.logger);
      throw error; // Ensure the error is propagated
    }
  }

  /**
   * Create a new query builder instance.
   */
  public createQueryBuilder(): Db2QueryBuilder {
    return new Db2QueryBuilder();
  }

  /**
   * Validate the configuration options.
   */
  private validateConfig(options: IDb2ConfigOptions): void {
    if (!options.host || !options.port || !options.auth || !options.database) {
      throw new Error(
        "Invalid configuration: Host, port, username, password, and database are required."
      );
    }
    if (options.useTls && !options.sslCertificatePath) {
      throw new Error(
        "TLS is enabled, but no SSL certificate path is provided."
      );
    }
    if (options.auth.authType === "jwt" && !options.auth) {
      throw new Error("JWT authentication requires a valid JWT token.");
    }
    if (options.auth.authType === "kerberos" && !options.auth) {
      throw new Error("Kerberos authentication requires a service name.");
    }
  }
}
