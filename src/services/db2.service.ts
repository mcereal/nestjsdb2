// src/services/db2.service.ts

/**
 *
 * @fileoverview This file contains the implementation of the Db2Service class.
 * This service class provides methods for connecting to a Db2 database, executing queries,
 * running migrations, and managing transactions. It also includes methods for checking the
 * health of the database connection, creating query builders, and clearing the cache.
 *
 * @class Db2Service
 *
 * @requires Pool, Database from ibm_db
 * @requires Db2ConfigOptions, Db2ConnectionInterface from "../interfaces/db2.interface"
 * @requires Db2ConnectionState from "../enums/db2.enums"
 * @requires Db2QueryBuilder from "./db2.query-builder"
 * @requires formatDb2Error from "../../db2.utils"
 * @requires Db2Error from "../../src/errors/db2.error"
 * @requires Cache from "cache-manager"
 *
 * @exports Db2Service
 *
 **/

/**
 * @typedef {import("../interfaces/db2.interface").Db2ConfigOptions} Db2ConfigOptions
 * @typedef {import("../interfaces/db2.interface").Db2ConnectionInterface} Db2ConnectionInterface
 * @typedef {import("../enums/db2.enums").Db2ConnectionState} Db2ConnectionState
 *
 * @typedef {import("cache-manager").Cache} Cache
 *
 * @typedef {import("ibm_db").Pool} Pool
 * @typedef {import("ibm_db").Database} Database
 *
 * @typedef {import("./db2.query-builder").Db2QueryBuilder} Db2QueryBuilder
 *
 * @typedef {import("../../db2.utils").formatDb2Error} formatDb2Error
 *
 * @typedef {import("../../src/errors/db2.error").Db2Error} Db2Error
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { Pool, Database } from "ibm_db";
import {
  Db2ConfigOptions,
  Db2ConnectionInterface,
} from "../interfaces/db2.interface";
import { Db2ConnectionState } from "../enums/db2.enums";
import { Db2QueryBuilder } from "./db2.query-builder";
import { formatDb2Error } from "../../db2.utils";
import { Db2Error } from "../../src/errors/db2.error";
import { Cache } from "cache-manager";

/**
 * @class Db2Service
 * @classdesc Db2Service class that provides methods for connecting to a Db2 database,
 * executing queries, running migrations, and managing transactions.
 * @implements {Db2ConnectionInterface}
 * @implements {OnModuleInit}
 * @implements {OnModuleDestroy}
 */
@Injectable()
export class Db2Service
  implements Db2ConnectionInterface, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(Db2Service.name);
  private state: Db2ConnectionState = Db2ConnectionState.DISCONNECTED;
  private pool: Pool;
  private connection: Database | null = null;
  private cache?: Cache; // Optional cache instance
  private primaryHost: string;
  private replicaHosts: string[] = [];

  // Configuration options passed directly to the constructor
  private options: Db2ConfigOptions;

  constructor(options: Db2ConfigOptions, cache?: Cache) {
    this.pool = new Pool({
      maxPoolSize: options.maxPoolSize || 10,
      minPoolSize: options.minPoolSize || 1,
      idleTimeout: options.idleTimeout || 30000,
      connectTimeout: options.connectionTimeout || 5000,
    });
    this.options = options;
    this.cache = cache;
    this.primaryHost = options.primaryHost || options.host;
    this.replicaHosts = options.readReplicaHosts || [];
  }

  /**
   * Lifecycle hook, called once the host module has been initialized.
   * Initializes the Db2 connection pool and connects to the database.
   * @returns Promise that resolves when the connection is established.
   * @throws Db2Error if an error occurs during initialization.
   * @throws Error if the configuration options are invalid.
   */
  async onModuleInit(): Promise<void> {
    this.logger.log("Initializing Db2Service...");
    this.validateConfig(this.options);
    await this.connect();
  }

  /**
   * Lifecycle hook, called once the host module is destroyed.
   * Drains the connection pool and disconnects from the database.
   * @returns Promise that resolves when the connection is closed.
   * @throws Db2Error if an error occurs during destruction.
   * @throws Error if the connection pool cannot be drained.
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log("Destroying Db2Service...");
    try {
      await this.drainPool();
      await this.disconnect();
    } catch (error) {
      this.handleError(error, "Module Destroy");
    }
  }

  /**
   * Returns the current state of the Db2 connection.
   * @returns The current connection state.
   * @throws Db2Error if an error occurs while getting the state.
   */
  getState(): Db2ConnectionState {
    try {
      this.logger.log(`Current connection state: ${this.state}`);
      return this.state;
    } catch (error) {
      this.handleError("Error getting connection state:", error.message);
      return Db2ConnectionState.ERROR;
    }
  }

  /**
   * Returns the number of active connections in the pool.
   * @returns The number of active connections in the pool.
   * @throws Db2Error if an error occurs while getting the connection count.
   */
  getActiveConnectionsCount(): number {
    this.logger.log("Getting active connections count...");
    try {
      const count = this.pool.getPoolSizeSync();
      this.logger.log(`Active connections in pool: ${count}`);
      return count;
    } catch (error) {
      this.handleError(error, "Get Active Connections Count");
      return -1;
    }
  }

  /**
   *  Returns the connection pool stats
   * @returns The connection pool stats
   * @throws Db2Error if an error occurs while getting the connection pool stats.
   */

  getConnectionPoolStats(): { active: number; idle: number; total: number } {
    try {
      const stats = this.pool.getPoolStatsSync();
      this.logger.log("Connection pool stats:", stats);
      return stats;
    } catch (error) {
      this.handleError(error, "Get Connection Pool Stats");
      return { active: -1, idle: -1, total: -1 };
    }
  }

  /**
   * Perform a health check to verify the database connection is active.
   * @returns true if the connection is active, false otherwise.
   * @throws Db2Error if an error occurs during the health check.
   */
  async checkHealth(): Promise<boolean> {
    try {
      this.logger.log("Performing health check...");
      const result = await this.query("SELECT 1 FROM SYSIBM.SYSDUMMY1");
      return result !== undefined;
    } catch (error) {
      this.handleError(error, "Health Check");
      return false;
    }
  }

  /**
   * Create a new query builder instance.
   * @returns A new instance of the Db2QueryBuilder class.
   * @throws Db2Error if an error occurs while creating the query builder.
   */
  createQueryBuilder(): Db2QueryBuilder {
    this.logger.log("Creating new query builder instance...");
    try {
      return new Db2QueryBuilder();
    } catch (error) {
      this.handleError(error, "Create Query Builder");
    }
  }

  /**
   * Run a SQL migration script with retry logic.
   * @param script SQL script to run as part of migration.
   * @throws Db2Error if an error occurs during migration.
   */
  async runMigration(script: string): Promise<void> {
    const retryAttempts = this.options.retryAttempts || 3; // Default to 3 retry attempts if not specified
    try {
      await this.executeWithRetry(script, [], retryAttempts);
      this.logger.log("Migration script executed successfully.");
    } catch (error) {
      this.logger.error("Error executing migration script:", error.message);
      this.handleError(error, "Migration");
    }
  }

  /**
   * Execute a prepared statement against the Db2 database with retry logic.
   * @param sql The SQL statement to prepare and execute.
   * @param params Optional parameters for the SQL statement.
   * @returns The result of the prepared statement execution.
   * @throws Db2Error if an error occurs during prepared statement execution.
   */
  async executePreparedStatement<T>(
    sql: string,
    params: any[] = []
  ): Promise<T> {
    try {
      const retryAttempts = this.options.retryAttempts || 3; // Default to 3 retry attempts if not specified
      return this.executeWithRetry(sql, params, retryAttempts);
    } catch (error) {
      this.handleError(error, "Execute Prepared Statement");
    }
  }

  /**
   * Drains the connection pool, closing all active connections.
   * @throws Db2Error if an error occurs while draining the pool.
   * @throws Error if the pool cannot be drained.
   */
  async drainPool(): Promise<void> {
    try {
      this.logger.log("Draining Db2 connection pool...");
      await this.pool.close();
      this.state = Db2ConnectionState.POOL_DRAINED;
      this.logger.log("Connection pool drained successfully.");
    } catch (error) {
      this.state = Db2ConnectionState.ERROR;
      this.handleError(error, "Draining Connection Pool");
    }
  }
  /**
   * Connect to the Db2 database using connection pooling.
   * If the primary host is unavailable, failover to a replica host if available.
   * @throws Db2Error if an error occurs during connection.
   */
  async connect(): Promise<void> {
    try {
      this.state = Db2ConnectionState.CONNECTING;
      const connStr = this.buildConnectionString();
      this.logger.log(`Connecting to Db2 database at ${this.primaryHost}...`);
      this.connection = await this.getConnectionFromPool(connStr);
      this.state = Db2ConnectionState.CONNECTED;
      this.logger.log("Successfully connected to Db2.");
    } catch (error) {
      this.state = Db2ConnectionState.ERROR;
      if (error.message.includes("refused")) {
        this.state = Db2ConnectionState.CONNECTION_REFUSED;
      } else if (error.message.includes("timeout")) {
        this.state = Db2ConnectionState.CONNECTION_TIMEOUT;
      }
      this.handleError(error, "Connection");
      if (this.options.enableLoadBalancing && this.replicaHosts.length > 0) {
        this.state = Db2ConnectionState.FAILOVER_IN_PROGRESS;
        await this.failoverToReplica();
      }
    }
  }

  /**
   * Failover to a replica host if connection to the primary host fails.
   * @throws Db2Error if all replica hosts fail to connect.
   */
  private async failoverToReplica(): Promise<void> {
    this.state = Db2ConnectionState.FAILOVER_IN_PROGRESS;
    for (const replica of this.replicaHosts) {
      try {
        this.logger.log(`Attempting to connect to replica host: ${replica}`);
        const connStr = this.buildConnectionString(replica);
        this.connection = await this.getConnectionFromPool(connStr);
        this.state = Db2ConnectionState.CONNECTED;
        this.logger.log(`Successfully connected to replica: ${replica}`);
        return;
      } catch (error) {
        this.logger.error(
          `Failed to connect to replica: ${replica}`,
          error.message
        );
      }
    }
    this.state = Db2ConnectionState.ERROR;
    this.logger.error("All replica hosts failed. Unable to connect to Db2.");
  }

  /**
   * Disconnect from the Db2 database.
   * @throws Db2Error if an error occurs during disconnection.
   */
  async disconnect(): Promise<void> {
    try {
      if (this.connection) {
        this.connection.closeSync();
        this.connection = null;
      }
      this.state = Db2ConnectionState.CONNECTION_CLOSED;
      this.logger.log("Successfully disconnected from Db2.");
    } catch (error) {
      this.state = Db2ConnectionState.ERROR;
      this.handleError(error, "Disconnection");
    }
  }

  /**
   * Standardized error handler for Db2 operations.
   * Logs the error and throws a formatted error message.
   * @param error The error object caught during the operation.
   * @param context Additional context information about where the error occurred.
   * @throws Db2Error with a formatted error message.
   */
  private handleError(error: any, context: string): void {
    const errorMessage = formatDb2Error(error, context, {
      host: this.options.host,
      database: this.options.database,
    });

    const structuredError = {
      context,
      message: errorMessage,
      host: this.options.host,
      database: this.options.database,
      timestamp: new Date().toISOString(),
    };

    this.logger.error(JSON.stringify(structuredError));

    throw new Db2Error(errorMessage); // Throw a custom Db2 error
  }

  /**
   * Executes a SQL query against the Db2 database with a timeout.
   * Checks cache first if caching is enabled.
   * @param sql The SQL query to execute.
   * @param params Optional parameters for the SQL query.
   * @param timeout Optional timeout for the query in milliseconds.
   * @returns The result of the query execution.
   * @throws Db2Error if an error occurs during query execution.
   */
  async query<T>(
    sql: string,
    params: any[] = [],
    timeout?: number
  ): Promise<T> {
    const startTime = Date.now();

    try {
      this.logger.log("Executing query...");
      const retryAttempts = this.options.retryAttempts || 3;

      const result = await this.executeWithRetry<T>(
        sql,
        params,
        retryAttempts,
        timeout
      );

      this.logQueryDetails(sql, params, Date.now() - startTime);

      return result;
    } catch (error) {
      this.logQueryDetails(sql, params, Date.now() - startTime, error);
      this.handleError(error, "Query");
      throw error;
    }
  }

  /**
   * Begin a database transaction.
   * @throws Db2Error if an error occurs during transaction start.
   */
  async beginTransaction(): Promise<void> {
    try {
      if (this.connection) {
        this.logger.log("Starting transaction...");
        this.connection.beginTransactionSync();
        this.logger.log("Transaction started.");
      } else {
        this.logger.warn("Cannot start transaction. No active connection.");
      }
    } catch (error) {
      this.handleError(error, "Begin Transaction");
    }
  }

  /**
   * Commit the current transaction.
   * @throws Db2Error if an error occurs during transaction commit.
   */
  async commitTransaction(): Promise<void> {
    try {
      if (this.connection) {
        this.logger.log("Committing transaction...");
        this.connection.commitTransactionSync();
        this.logger.log("Transaction committed.");
      } else {
        this.logger.warn("Cannot commit transaction. No active connection.");
      }
    } catch (error) {
      this.handleError(error, "Commit Transaction");
    }
  }

  /**
   * Retry logic for executing a query with retry options.
   * @param sql The SQL query to execute.
   * @param params Optional parameters for the SQL query.
   * @param attempts Number of retry attempts remaining.
   * @param timeout Optional timeout for the query in milliseconds.
   * @returns The result of the query execution.
   * @throws Error if the query fails after all retry attempts.
   * @throws TimeoutError if the query execution times out.
   * @throws Db2Error if an unexpected error occurs.
   */
  private async executeWithRetry<T>(
    sql: string,
    params: any[] = [],
    attempts: number,
    timeout?: number
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const cacheKey = this.generateCacheKey(sql, params);

      if (this.cache && this.options.cacheEnabled) {
        const cachedResult = await this.cache.get<T>(cacheKey);
        if (cachedResult) {
          this.logger.log("Returning result from cache.");
          return cachedResult;
        }
      }

      if (this.state !== Db2ConnectionState.CONNECTED) {
        this.logger.warn("Not connected to Db2. Attempting to reconnect...");
        await this.connect();
      }

      if (this.options.logQueries) {
        this.logger.log(`Executing query: ${sql} with params: ${params}`);
      }

      return new Promise<T>((resolve, reject) => {
        const queryTimeout = timeout || this.options.queryTimeout || 10000; // Default timeout of 10 seconds
        const timer = setTimeout(() => {
          this.logger.warn("Query execution timed out.");
          const timeoutError = new Db2Error("Query execution timed out.");
          this.logQueryDetails(
            sql,
            params,
            Date.now() - startTime,
            timeoutError
          );
          reject(timeoutError);
        }, queryTimeout);

        this.connection.query(sql, params, (err, data) => {
          clearTimeout(timer);
          const duration = Date.now() - startTime;
          if (err) {
            if (this.options.logErrors) {
              this.logger.error(`Error executing query: ${err.message}`);
            }
            this.logQueryDetails(sql, params, duration, err);
            return reject(err);
          }
          if (duration > 5000) {
            this.logger.warn(
              `Slow query detected. Execution time: ${duration} ms`
            );
          }

          this.logQueryDetails(sql, params, duration);
          resolve(data as T);
        });
      });
    } catch (error) {
      if (attempts > 1) {
        const retryInterval = this.options.retryInterval || 1000; // Default to 1 second
        this.logger.warn(`Retrying query... Attempts left: ${attempts - 1}`);
        await new Promise((resolve) => setTimeout(resolve, retryInterval));
        return this.executeWithRetry(sql, params, attempts - 1, timeout);
      } else {
        this.logQueryDetails(sql, params, Date.now() - startTime, error);
        throw error;
      }
    }
  }

  /**
   * Rollback the current transaction.
   * @throws Db2Error if an error occurs during transaction rollback.
   */
  async rollbackTransaction(): Promise<void> {
    try {
      if (this.connection) {
        this.connection.rollbackTransactionSync();
        this.logger.log("Transaction rolled back.");
      } else {
        this.logger.warn("Cannot rollback transaction. No active connection.");
      }
    } catch (error) {
      this.handleError(error, "Rollback Transaction");
    }
  }

  /**
   * Build a connection string for Db2.
   * @param hostOverride Optional host to use instead of the primary host.
   */
  private buildConnectionString(hostOverride?: string): string {
    const {
      port,
      username,
      password,
      database,
      useTls,
      sslCertificatePath,
      clientInfo,
      authType,
      jwtTokenPath,
      kerberosServiceName,
      validateServerCertificate,
    } = this.options;

    const host = hostOverride || this.primaryHost;

    let connStr = `DATABASE=${database};HOSTNAME=${host};PORT=${port};PROTOCOL=TCPIP;UID=${username};PWD=${password};`;

    if (useTls) {
      connStr += `Security=SSL;SSLServerCertificate=${sslCertificatePath};`;
      if (validateServerCertificate) {
        connStr += `ValidateServerCertificate=true;`;
      } else {
        connStr += `ValidateServerCertificate=false;`;
      }
    }

    if (clientInfo) {
      connStr += `ClientUser=${clientInfo};`;
    }

    if (authType === "jwt" && jwtTokenPath) {
      connStr += `AuthType=JWT;JwtTokenPath=${jwtTokenPath};`;
    } else if (authType === "kerberos" && kerberosServiceName) {
      connStr += `AuthType=KERBEROS;KerberosServiceName=${kerberosServiceName};`;
    }

    return connStr;
  }
  /**
   * Retrieve a connection from the pool.
   * @param connStr The connection string to use for the connection.
   * @returns A new connection from the pool.
   * @throws Db2Error if an error occurs while getting a connection.
   */
  private async getConnectionFromPool(connStr: string): Promise<Database> {
    return new Promise<Database>((resolve, reject) => {
      this.pool.open(connStr, (err, conn) => {
        if (err) {
          this.handleError(err, "Getting Connection from Pool");
          return reject(err);
        }
        resolve(conn);
      });
    });
  }

  /**
   * Validates the provided configuration options.
   * @param options Configuration options to validate.
   * @throws Error if the configuration is invalid.
   */
  private validateConfig(options: Db2ConfigOptions): void {
    if (
      !options.host ||
      !options.port ||
      !options.username ||
      !options.password ||
      !options.database
    ) {
      throw new Error(
        "Invalid configuration: Host, port, username, password, and database are required."
      );
    }
    if (options.useTls && !options.sslCertificatePath) {
      throw new Error(
        "TLS is enabled, but no SSL certificate path is provided."
      );
    }
    if (options.authType === "jwt" && !options.jwtTokenPath) {
      throw new Error("JWT authentication requires a valid JWT token path.");
    }
    if (options.authType === "kerberos" && !options.kerberosServiceName) {
      throw new Error("Kerberos authentication requires a service name.");
    }
  }

  /**
   * Generates a cache key based on the SQL query and parameters.
   * @param sql The SQL query string.
   * @param params The parameters used in the query.
   * @returns A string that uniquely identifies the cache entry.
   */
  private generateCacheKey(sql: string, params: any[]): string {
    const paramsKey = params.map((p) => JSON.stringify(p)).join(":");
    return `${sql}:${paramsKey}`;
  }

  /**
   * Clears the cache for a specific SQL query and parameters.
   * @param sql The SQL query string.
   * @param params The parameters used in the query.'
   * @returns A promise that resolves when the cache is cleared.
   * @throws Error if the cache cannot be cleared.
   */
  async clearCache(sql: string, params: any[] = []): Promise<boolean> {
    if (this.cache) {
      try {
        const cacheKey = this.generateCacheKey(sql, params);
        await this.cache.del(cacheKey);
        this.logger.log(`Cache cleared for query: ${sql}`);
        return true;
      } catch (error) {
        this.logger.error("Error clearing cache:", error.message);
        return false;
      }
    }
    return false; // or throw an error if cache is not defined
  }

  /**
   * Clears the entire cache.
   * @returns A promise that resolves when the entire cache is cleared.
   * @throws Error if the cache cannot be cleared.
   */
  async resetCache(): Promise<boolean> {
    if (this.cache) {
      try {
        await this.cache.reset();
        this.logger.log(`Entire cache has been cleared.`);
      } catch (error) {
        this.logger.error("Error resetting cache:", error.message);
        return false;
      }
    }
  }

  /**
   * Logs details about executed queries for auditing and monitoring.
   * @param sql The SQL query that was executed.
   * @param params The parameters used in the query.
   * @param duration The execution time in milliseconds.
   * @param error Optional error that occurred during query execution.
   * @throws Error if the log cannot be saved.
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

    // Structured logging using JSON format for better log aggregation and analysis
    this.logger.log(JSON.stringify(logMessage));

    // Optional: Save logs to a database or external logging service for auditing
    if (this.options.logQueries) {
      this.saveAuditLog(logMessage);
    }
  }

  /**
   * Save audit logs to a database or external service for compliance and tracking.
   * @param logMessage The log message to save.
   * @returns A promise that resolves when the log is saved.
   * @throws Error if the log cannot be saved.
   */
  private async saveAuditLog(logMessage: object): Promise<boolean> {
    try {
      // Example: Save the log to a dedicated audit logs table
      const auditSql = `INSERT INTO audit_logs (log) VALUES (?)`;
      await this.query(auditSql, [JSON.stringify(logMessage)]);
      this.logger.log("Audit log saved successfully.");
    } catch (error) {
      this.logger.error("Failed to save audit log:", error.message);
      return false;
    }
  }
}
