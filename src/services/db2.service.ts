// src/services/db2.service.ts

/**
 * @fileoverview This file contains the main service class for interacting with a Db2 database.
 * The Db2Service class provides methods for executing queries, managing transactions, running migrations,
 * and handling database connections. It also includes lifecycle hooks for initializing and destroying the service.
 * The service class is designed to be used as a singleton instance within a NestJS application, providing a
 * centralized interface for interacting with the database.
 *
 * @class Db2Service
 *
 * @requires Injectable from "@nestjs/common"
 * @requires Logger from "@nestjs/common"
 * @requires OnModuleInit from "@nestjs/common"
 * @requires OnModuleDestroy from "@nestjs/common"
 * @requires Db2ConfigOptions from "src/interfaces/db2.interface"
 * @requires Db2ConnectionInterface from "src/interfaces/db2.interface"
 * @requires Db2ConnectionState from "src/enums/db2.enums"
 * @requires Db2QueryBuilder from "src/query-builder/db2.query-builder"
 * @requires formatDb2Error from "src/utils/db2.utils"
 * @requires Db2Error from "src/errors/db2.error"
 * @requires Cache from "cache-manager"
 * @requires Db2Connection from "src/db/db2-connection"
 * @requires TransactionManager from "src/db/transaction-manager"
 *
 * @exports Db2Service
 * @implements Db2ConnectionInterface
 * @implements OnModuleInit
 * @implements OnModuleDestroy
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import {
  Db2ConfigOptions,
  Db2ConnectionInterface,
} from "../interfaces/db2.interface";
import { Db2ConnectionState } from "../enums/db2.enums";
import { Db2QueryBuilder } from "../query-builder/db2.query-builder";
import { formatDb2Error } from "src/utils/db2.utils";
import { Db2Error } from "../../src/errors/db2.error";
import { Cache } from "cache-manager";
import { Db2Connection } from "src/db/db2-connection";
import { TransactionManager } from "../db/transaction-manager";

/**
 * @class Db2Service
 * @description The main service class for interacting with a Db2 database.
 * This class provides methods for executing queries, managing transactions, running migrations,
 * and handling database connections. It also includes lifecycle hooks for initializing and destroying the service.
 * The service class is designed to be used as a singleton instance within a NestJS application, providing a
 * centralized interface for interacting with the database.
 * @exports Db2Service
 * @implements Db2ConnectionInterface
 * @implements OnModuleInit
 * @implements OnModuleDestroy
 * @example
 * ```typescript
 * import { Injectable } from "@nestjs/common";
 * import { Db2Service } from "src/services/db2.service";
 * import { Db2ConfigOptions } from "src/interfaces/db2.interface";
 * import { Cache } from "cache-manager";
 *
 * @Injectable()
 * class ExampleService {
 *  constructor(private db2Service: Db2Service) {}
 * }
 * ```
 */
@Injectable()
export class Db2Service
  implements Db2ConnectionInterface, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(Db2Service.name);
  private connection: Db2Connection;
  private cache?: Cache;
  private transactionManager: TransactionManager;

  private options: Db2ConfigOptions;

  constructor(options: Db2ConfigOptions, cache?: Cache) {
    this.options = options;
    this.cache = cache;
    this.connection = new Db2Connection(this.options);
    this.transactionManager = new TransactionManager(this.connection);
  }

  /**
   * Lifecycle hook that runs when the module is initialized.
   * This method is used to establish a connection to the database
   * and perform any necessary setup operations.
   * @returns {Promise<void>}
   */
  async onModuleInit(): Promise<void> {
    this.logger.log("Initializing Db2Service...");
    this.validateConfig(this.options);
    await this.connect();
  }

  /**
   * Lifecycle hook that runs when the module is destroyed.
   * This method is used to close the database connection and perform
   * any necessary cleanup operations.
   * @returns {Promise<void>}
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log("Destroying Db2Service...");
    try {
      await this.connection.drainPool();
      await this.disconnect();
    } catch (error) {
      this.handleError(error, "Module Destroy");
    }
  }

  /**
   * Get the current state of the database connection.
   * @returns {Db2ConnectionState} The current connection state.
   * @example
   * ```typescript
   * const state = db2Service.getState();
   * console.log("Connection state:", state);
   * ```
   */
  getState(): Db2ConnectionState {
    return this.connection.getState();
  }

  /**
   * Get the number of active connections in the connection pool.
   * @returns {number} The number of active connections.
   * @example
   * ```typescript
   * const count = db2Service.getActiveConnectionsCount();
   * console.log("Active connections:", count);
   * ```
   */
  getActiveConnectionsCount(): number {
    return this.connection.getActiveConnectionsCount();
  }

  /**
   * Check the health of the database connection.
   * @returns {Promise<boolean>} A promise that resolves with a boolean indicating the health of the connection.
   * @example
   * ```typescript
   * const isHealthy = await db2Service.checkHealth();
   * console.log("Connection health:", isHealthy);
   * ```
   */
  async checkHealth(): Promise<boolean> {
    return await this.connection.checkHealth();
  }

  /**
   * Create a new query builder instance.
   * @returns A new instance of the Db2QueryBuilder class.
   * @example
   * ```typescript
   * const queryBuilder = db2Service.createQueryBuilder();
   * queryBuilder.select("*").from("users").where("id = 1");
   * ```
   */
  createQueryBuilder(): Db2QueryBuilder {
    return new Db2QueryBuilder();
  }

  /**
   * Run a migration script on the database.
   * @param script The migration script to execute.
   * @returns {Promise<void>}
   * @throws Db2Error if an error occurs during migration.
   * @example
   * ```typescript
   * await db2Service.runMigration("CREATE TABLE users (id INT, name VARCHAR(255))");
   * ```
   */
  async runMigration(script: string): Promise<void> {
    try {
      await this.connection.query(script);
      this.logger.log("Migration script executed successfully.");
    } catch (error) {
      this.logger.error("Error executing migration script:", error.message);
      this.handleError(error, "Migration");
    }
  }

  /**
   * Execute a prepared statement on the database.
   * @param sql The SQL query string to execute.
   * @param params An array of parameters to bind to the query.
   * @returns A promise that resolves with the result of the query.
   * @throws Db2Error if an error occurs during query execution.
   * @example
   * ```typescript
   * const result = await db2Service.executePreparedStatement("SELECT * FROM users WHERE id = ?", [1]);
   * ```
   */
  async executePreparedStatement<T>(
    sql: string,
    params: any[] = []
  ): Promise<T> {
    try {
      return await this.connection.executePreparedStatement<T>(sql, params);
    } catch (error) {
      this.handleError(error, "Execute Prepared Statement");
    }
  }

  /**
   * Drain the connection pool, closing all active connections.
   * @returns {Promise<void>}
   * @example
   * ```typescript
   * await db2Service.drainPool();
   * ```
   */
  async drainPool(): Promise<void> {
    await this.connection.drainPool();
  }

  /**
   * Establish a connection to the Db2 database.
   * @returns {Promise<void>}
   * @throws Db2Error if an error occurs during connection.
   * @example
   * ```typescript
   * await db2Service.connect();
   * ```
   */
  async connect(): Promise<void> {
    try {
      await this.connection.connect();
    } catch (error) {
      this.handleError(error, "Connection");
    }
  }

  /**
   * Close the connection to the Db2 database.
   * @returns {Promise<void>}
   * @throws Db2Error if an error occurs during disconnection.
   * @example
   * ```typescript
   * await db2Service.disconnect();
   * ```
   */
  async disconnect(): Promise<void> {
    await this.connection.disconnect();
  }

  /**
   * Handle errors that occur during database operations.
   * @param error The error object that was thrown.
   * @param context The context in which the error occurred.
   * @throws Db2Error with a formatted error message.
   * @example
   * ```typescript
   * try {
   *  await db2Service.connect();
   * } catch (error) {
   * this.handleError(error, "Connection");
   * }
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
   * Execute a SQL query on the database.
   * @param sql The SQL query string to execute.
   * @param params An array of parameters to bind to the query.
   * @param timeout The query timeout in milliseconds (optional).
   * @returns A promise that resolves with the result of the query.
   * @throws Db2Error if an error occurs during query execution.
   * @example
   * ```typescript
   * const result = await db2Service.query("SELECT * FROM users WHERE id = ?", [1]);
   * ```
   */
  async query<T>(
    sql: string,
    params: any[] = [],
    timeout?: number
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await this.connection.query<T>(sql, params, timeout);
      this.logQueryDetails(sql, params, Date.now() - startTime);
      return result;
    } catch (error) {
      this.logQueryDetails(sql, params, Date.now() - startTime, error);
      this.handleError(error, "Query");
      throw error;
    }
  }

  /**
   * Begin a transaction with optional isolation level.
   * @param isolationLevel The isolation level for the transaction (optional).
   * @throws Db2Error if an error occurs during transaction management.
   * @example
   * ```typescript
   * await db2Service.beginTransaction();
   * ```
   */
  async beginTransaction(): Promise<void> {
    try {
      await this.transactionManager.beginTransaction();
    } catch (error) {
      this.handleError(error, "Begin Transaction");
    }
  }

  /**
   * Commit the current transaction.
   * @returns {Promise<void>}
   * @throws Db2Error if no transaction is active or if an error occurs during commit.
   * @example
   * ```typescript
   * await db2Service.commitTransaction();
   * ```
   */
  async commitTransaction(): Promise<void> {
    try {
      await this.transactionManager.commitTransaction();
    } catch (error) {
      this.handleError(error, "Commit Transaction");
    }
  }

  /**
   * Roll back the current transaction.
   * @returns {Promise<void>}
   * @throws Db2Error if an error occurs during rollback.
   * @example
   * ```typescript
   * await db2Service.rollbackTransaction();
   * ```
   */
  async rollbackTransaction(): Promise<void> {
    try {
      await this.transactionManager.rollbackTransaction();
    } catch (error) {
      this.handleError(error, "Rollback Transaction");
    }
  }

  /**
   * Validate the configuration options for the Db2 service.
   * @param options The configuration options to validate.
   * @throws Error if the configuration is invalid.
   * @example
   * ```typescript
   * db2Service.validateConfig(options);
   * ```
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
   * Log details of a query execution.
   * @param sql The SQL query string that was executed.
   * @param params The parameters that were bound to the query.
   * @param duration The duration of the query execution in milliseconds.
   * @param error The error object if the query failed (optional).
   * @example
   * ```typescript
   * logQueryDetails(sql, params, duration, error);
   * ```
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
   * Cache the result of a query using the provided key.
   * @param sql The SQL query string to cache.
   * @param params An array of parameters to bind to the query.
   * @param result The result of the query to cache.
   * @param ttl The time-to-live for the cached result, in seconds.
   * @returns A promise that resolves as a boolean when the result is cached.
   * @example
   * ```typescript
   * await db2Service.cacheResult("SELECT * FROM users WHERE id = ?", [1], { id: 1, name: "John Doe" }, 60);
   * ```
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
   * Cache the result of a query using the provided key.
   * @param sql The SQL query string to cache.
   * @param params An array of parameters to bind to the query.
   * @param result The result of the query to cache.
   * @param ttl The time-to-live for the cached result, in seconds.
   * @returns A promise that resolves when the result is cached.
   * @example
   * ```typescript
   * await db2Service.cacheResult("SELECT * FROM users WHERE id = ?", [1], { id: 1, name: "John Doe" }, 60);
   * ```
   */
  private generateCacheKey(sql: string, params: any[]): string {
    const paramsKey = params.map((p) => JSON.stringify(p)).join(":");
    return `${sql}:${paramsKey}`;
  }
}
