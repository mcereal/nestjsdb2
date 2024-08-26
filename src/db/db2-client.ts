// src/db/db2-client.ts

import SQL_ATTR_ROWCOUNT_PREFETCH, { Pool, Connection } from "ibm_db";
import {
  Db2ClientInterface,
  Db2ConfigOptions,
} from "../interfaces/db2.interface";
import { Db2ConnectionState } from "../enums/db2.enums";
import { Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Db2ConnectionError, Db2Error } from "../errors/db2.error";
import { appendFileSync } from "fs";
import { Db2AuthStrategy } from "src/auth/db2-auth.strategy";
import { createAuthStrategy } from "src/auth/auth-factory";
import { formatDb2Error } from "src/utils/db2.utils";

export class Db2Client
  implements Db2ClientInterface, OnModuleInit, OnModuleDestroy
{
  private pool: Pool;
  private connection: Connection | null = null;
  private config: Db2ConfigOptions;
  private authStrategy: Db2AuthStrategy;
  private logger = new Logger(Db2Client.name);
  private state: Db2ConnectionState = Db2ConnectionState.DISCONNECTED;
  private lastUsed: number = Date.now();
  private idleTimeoutInterval: NodeJS.Timeout;
  private connectionLifetimeInterval: NodeJS.Timeout;
  private currentReconnectAttempts: number = 0;

  constructor(config: Db2ConfigOptions) {
    this.config = {
      ...config,
      retry: {
        maxReconnectAttempts: config.retry?.maxReconnectAttempts ?? 3, // Default to 3 attempts
        reconnectInterval: config.retry?.reconnectInterval ?? 5000, // Default to 5 seconds
      },
      connectionTimeout: config.connectionTimeout ?? 30000, // Default to 30 seconds
      idleTimeout: config.idleTimeout ?? 60000, // Default to 1 minute
      maxLifetime: config.maxLifetime ?? 1800000, // Default to 30 minutes
      autoCommit: config.autoCommit ?? true, // Default to true
      fetchSize: config.fetchSize ?? 100, // Default to 100 rows
      queryTimeout: config.queryTimeout ?? 15000, // Default to 15 seconds
      prefetchSize: config.prefetchSize ?? 10, // Default to 10 rows
      characterEncoding: config.characterEncoding ?? "UTF-8", // Default to UTF-8
      logging: {
        logQueries: config.logging?.logQueries ?? false, // Default to false
        logErrors: config.logging?.logErrors ?? true, // Default to true
        profileSql: config.logging?.profileSql ?? false, // Default to false
      },
    };
    this.authStrategy = createAuthStrategy(config.auth, this);
    this.pool = new Pool({
      minPoolSize: config.minPoolSize || 1, // Default to 1 if not set
      maxPoolSize: config.maxPoolSize || 10, // Default to 10 if not set
    });
  }

  onModuleInit() {
    // Start idle timeout checks when the module initializes
    this.startIdleTimeoutCheck();
    // Start pool monitoring
    this.startPoolMonitoring();
  }

  onModuleDestroy() {
    // Clear the idle timeout check interval when the module is destroyed
    this.stopIdleTimeoutCheck();
    // Close all connections in the pool
    this.pool.closeAll();
    this.logger.log("All connections in the pool have been closed.");
  }

  /**
   * Start the periodic idle timeout check.
   */
  private startIdleTimeoutCheck() {
    const idleTimeoutCheckInterval = 10000; // Check every 10 seconds
    this.idleTimeoutInterval = setInterval(() => {
      this.checkIdleTimeout();
    }, idleTimeoutCheckInterval);
    this.logger.log("Started idle timeout checks.");
  }

  /**
   * Stop the periodic idle timeout check.
   */
  private stopIdleTimeoutCheck() {
    if (this.idleTimeoutInterval) {
      clearInterval(this.idleTimeoutInterval);
      this.logger.log("Stopped idle timeout checks.");
    }
  }

  /**
   * Establishes a connection to the Db2 database using the connection pool.
   */
  async connect(): Promise<void> {
    if (this.state === Db2ConnectionState.CONNECTED) {
      this.logger.warn("Already connected to the Db2 database.");
      return;
    }

    this.logger.log("Connecting to Db2 database using the connection pool...");
    this.state = Db2ConnectionState.CONNECTING;

    const connStr = this.buildConnectionString(this.config);
    const connectionTimeout = this.config.connectionTimeout || 30000; // Default to 30 seconds if not set

    try {
      await this.authStrategy.authenticate();
      this.connection = await Promise.race([
        this.withRetry(() => this.getConnectionFromPool(connStr)),
        new Promise<never>((_, reject) =>
          setTimeout(() => {
            this.state = Db2ConnectionState.CONNECTION_TIMEOUT;
            reject(new Db2Error("Connection timed out"));
          }, connectionTimeout)
        ),
      ]);

      this.connection.setAutoCommit(this.config.autoCommit ?? true);
      this.state = Db2ConnectionState.CONNECTED;
      this.logger.log("Successfully connected to Db2 database.");

      this.startConnectionLifetimeCheck();
      this.currentReconnectAttempts = 0;
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  private async handleConnectionError(error: Error): Promise<void> {
    // Log the error
    this.logger.error("Connection error:", error.message);

    // Set the state based on the error message
    if (error.message.includes("refused")) {
      this.state = Db2ConnectionState.CONNECTION_REFUSED;
    } else {
      this.state = Db2ConnectionState.ERROR;
    }

    // Increment the reconnect attempt count
    this.currentReconnectAttempts++;

    // Log reconnect attempts
    const maxReconnectAttempts = this.config.retry?.maxReconnectAttempts || 3;
    const reconnectInterval = this.config.retry?.reconnectInterval || 5000;

    if (this.currentReconnectAttempts <= maxReconnectAttempts) {
      this.logger.warn(
        `Reconnect attempt ${this.currentReconnectAttempts}/${maxReconnectAttempts} in ${reconnectInterval}ms...`
      );
      await this.sleep(reconnectInterval);
      await this.reconnect(); // Attempt to reconnect
    } else {
      // Attempt failover to secondary host if configured
      if (this.config.retry?.failoverHost) {
        this.logger.warn("Failing over to secondary database host...");
        const originalHost = this.config.host;
        const originalPort = this.config.port;

        // Update config to use failover host
        this.config.host = this.config.retry?.failoverHost;
        this.config.port = this.config.retry?.failoverPort || this.config.port;

        try {
          await this.reconnect(); // Attempt to connect to failover host
        } catch (failoverError) {
          // Restore original config if failover also fails
          this.config.host = originalHost;
          this.config.port = originalPort;
          this.logger.error("Failover failed:", failoverError.message);
          throw new Db2ConnectionError(
            "Failed to connect to primary and failover hosts"
          );
        }
      } else {
        throw new Db2ConnectionError(
          "All reconnection attempts failed. No failover host configured."
        );
      }
    }
  }

  /**
   * Reconnect logic for the Db2 client.
   * Attempts to re-establish a connection using the existing configuration.
   */
  private async reconnect(): Promise<void> {
    this.logger.log("Attempting to reconnect to Db2 database...");
    this.state = Db2ConnectionState.RECONNECTING;

    try {
      await this.disconnect();
      await this.connect();
      this.logger.log("Reconnection successful.");
    } catch (error) {
      this.state = Db2ConnectionState.ERROR;
      this.logger.error("Reconnection failed:", error.message);
      throw new Db2Error("Failed to reconnect to Db2 database");
    }
  }

  /**
   * Closes the connection to the Db2 database and releases it back to the pool.
   */
  async disconnect(): Promise<void> {
    if (
      this.state === Db2ConnectionState.CONNECTED ||
      this.state === Db2ConnectionState.ERROR
    ) {
      this.state = Db2ConnectionState.CONNECTION_CLOSED;
      try {
        await this.closeConnection(); // Attempt to close the connection (release to pool)
        this.state = Db2ConnectionState.DISCONNECTED;
        this.logger.log(
          "Db2 database connection closed and released back to the pool."
        );
        // Stop connection lifetime check
        this.stopConnectionLifetimeCheck();
      } catch (error) {
        this.state = Db2ConnectionState.ERROR;
        this.logError("Error disconnecting from Db2 database", error);
        throw new Db2Error("Failed to disconnect from Db2 database");
      }
    } else {
      this.logger.warn("No active connection to disconnect.");
    }
  }

  /**
   * Acquire a connection from the pool.
   * @param connStr The connection string for the Db2 database.
   * @returns A promise that resolves to a connection from the pool.
   */
  public async getConnectionFromPool(connStr: string): Promise<Connection> {
    return new Promise((resolve, reject) => {
      const acquireTimeout = this.config.acquireTimeoutMillis || 30000; // Default to 30 seconds

      const timeoutHandle = setTimeout(() => {
        reject(new Db2Error("Acquire connection timeout"));
      }, acquireTimeout);

      this.pool.open(connStr, (err, connection) => {
        clearTimeout(timeoutHandle);
        if (err) {
          reject(err);
        } else {
          resolve(connection);
        }
      });
    });
  }

  /**
   * Releases the current connection back to the pool.
   */
  private closeConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connection) {
        this.pool.close(this.connection, (err) => {
          if (err) {
            reject(err);
          } else {
            this.connection = null; // Clear the connection
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  public getConfig(): Db2ConfigOptions {
    return this.config;
  }

  public setState(state: Db2ConnectionState): void {
    this.state = state;
    this.logger.log(`Db2 connection state changed to: ${state}`);
  }

  public async releaseConnection(connection: Connection): Promise<void> {
    return new Promise((resolve, reject) => {
      this.state = Db2ConnectionState.DISCONNECTING;
      this.pool.close(connection, (err) => {
        if (err) {
          this.state = Db2ConnectionState.ERROR;
          this.logger.error("Error releasing connection:", err.message);
          reject(new Db2Error("Failed to release connection"));
        } else {
          this.state = Db2ConnectionState.DISCONNECTED;
          this.logger.log("Connection successfully released back to the pool.");
          resolve();
        }
      });
    });
  }

  /**
   * Executes a SQL query against the Db2 database.
   * @param sql The SQL query string to execute.
   * @param params An array of parameters to bind to the query.
   * @param timeout The query timeout in milliseconds (optional).
   * @returns A promise that resolves with the result of the query.
   */
  async query<T>(
    sql: string,
    params: any[] = [],
    timeout?: number
  ): Promise<T> {
    this.lastUsed = Date.now();
    if (this.state !== Db2ConnectionState.CONNECTED) {
      this.logger.warn("No active connection. Attempting to reconnect...");
      await this.reconnect(); // Attempt to reconnect
    }

    this.logQuery(`Executing query: ${sql}`, params);
    return new Promise<T>((resolve, reject) => {
      try {
        const stmt = this.connection.prepareSync(sql);

        if (timeout) {
          stmt.setQueryTimeout(timeout / 1000); // Convert milliseconds to seconds
        }

        const prefetchSize = this.config.prefetchSize || 10; // Default to 10 rows if not specified
        stmt.setAttr(SQL_ATTR_ROWCOUNT_PREFETCH, prefetchSize);

        const startTime = Date.now();
        stmt.execute(params, (error, result) => {
          if (error) {
            this.state = Db2ConnectionState.ERROR;
            this.logError("Query error", error);
            reject(new Db2Error("Query execution failed", error, params));
          } else {
            const duration = Date.now() - startTime;
            if (this.config.logging?.profileSql) {
              this.logger.debug(`Query executed in ${duration}ms: ${sql}`);
            }
            resolve(result);
          }
          stmt.closeSync(); // Close the statement after execution
        });
      } catch (error) {
        this.state = Db2ConnectionState.ERROR;
        this.logError("Error preparing query", error);
        reject(new Db2Error("Failed to prepare or execute the query"));
      }
    });
  }

  // src/db/db2-client.ts

  /**
   * Executes a batch insert operation on the Db2 database.
   * @param tableName The name of the table to insert into.
   * @param columns The columns to insert data into.
   * @param valuesArray An array of value arrays, each containing values for a single row.
   * @returns A promise that resolves when the batch insert is complete.
   */
  async batchInsert(
    tableName: string,
    columns: string[],
    valuesArray: any[][]
  ): Promise<void> {
    this.logger.log(`Starting batch insert into table: ${tableName}`);

    if (!this.connection) {
      this.logger.warn(
        "No active connection to perform batch insert. Attempting to reconnect..."
      );
      await this.reconnect(); // Attempt to reconnect before batch insert
    }

    const columnsString = columns.join(", ");
    const placeholders = columns.map(() => "?").join(", "); // Generate placeholders (?, ?, ...)
    const sql = `INSERT INTO ${tableName} (${columnsString}) VALUES (${placeholders})`;

    try {
      const stmt = this.connection.prepareSync(sql); // Prepare the statement

      for (const values of valuesArray) {
        stmt.executeSync(values); // Execute each row
      }

      stmt.closeSync(); // Close the statement after execution
      this.logger.log(`Batch insert completed for table: ${tableName}`);
    } catch (error) {
      this.logError("Batch insert error", error);
      throw new Db2Error("Batch insert failed");
    }
  }

  // src/db/db2-client.ts

  /**
   * Executes a batch update operation on the Db2 database.
   * @param tableName The name of the table to update.
   * @param columns The columns to update.
   * @param valuesArray An array of value arrays, each containing values for a single row update.
   * @param whereClause A string representing the WHERE clause for the update.
   * @returns A promise that resolves when the batch update is complete.
   */
  async batchUpdate(
    tableName: string,
    columns: string[],
    valuesArray: any[][],
    whereClause: string
  ): Promise<void> {
    this.logger.log(`Starting batch update on table: ${tableName}`);

    if (!this.connection) {
      this.logger.warn(
        "No active connection to perform batch update. Attempting to reconnect..."
      );
      await this.reconnect(); // Attempt to reconnect before batch update
    }

    const setString = columns.map((col) => `${col} = ?`).join(", ");
    const sql = `UPDATE ${tableName} SET ${setString} WHERE ${whereClause}`;

    try {
      const stmt = this.connection.prepareSync(sql); // Prepare the statement

      for (const values of valuesArray) {
        stmt.executeSync(values); // Execute each row update
      }

      stmt.closeSync(); // Close the statement after execution
      this.logger.log(`Batch update completed for table: ${tableName}`);
    } catch (error) {
      this.logError("Batch update error", error);
      throw new Db2Error("Batch update failed");
    }
  }

  /**
   * Logs SQL queries if logging is enabled.
   * @param message The message to log.
   * @param params The query parameters to log.
   */
  private logQuery(message: string, params: any[]) {
    if (this.config.logging?.logQueries) {
      const logMessage = `${message} | Params: ${JSON.stringify(params)}`;
      this.logger.log(logMessage);
      this.writeTraceLog(logMessage);
    }
  }

  /**
   * Logs errors if logging is enabled.
   * @param message The message to log.
   * @param error The error object to log.
   */
  private logError(message: string, error: Error) {
    if (this.config.logging?.logErrors) {
      const logMessage = `${message}: ${error.message}`;
      this.logger.error(logMessage);
      this.writeTraceLog(logMessage);
    }
  }

  /**
   * Logs the current pool status, including active and idle connections.
   */
  public logPoolStatus(): void {
    const activeConnections = this.getActiveConnectionsCount();
    const totalConnections = this.getTotalConnectionsCount();

    this.logger.log(
      `Connection Pool Status: Active=${activeConnections}, Total=${totalConnections}`
    );
  }

  /**
   * Writes trace logs to a file if a trace file path is configured.
   * @param message The trace message to write.
   */
  private writeTraceLog(message: string) {
    if (this.config.logging?.traceFilePath) {
      try {
        appendFileSync(
          this.config.logging?.traceFilePath,
          `${new Date().toISOString()} - ${message}\n`
        );
      } catch (err) {
        this.logger.error("Failed to write to trace file:", err.message);
      }
    }
  }

  /**
   * Adjusts the connection pool size dynamically based on the current load.
   * @param activeConnectionsThreshold The threshold for active connections to trigger pool resizing.
   * @param minPoolSize The new minimum pool size if the threshold is exceeded.
   * @param maxPoolSize The new maximum pool size if the threshold is exceeded.
   */
  public async adjustPoolSizeBasedOnLoad(
    activeConnectionsThreshold: number,
    minPoolSize: number,
    maxPoolSize: number
  ): Promise<void> {
    // Validate input parameters
    if (minPoolSize < 1 || maxPoolSize < minPoolSize) {
      this.logger.error(
        `Invalid pool size configuration: minPoolSize=${minPoolSize}, maxPoolSize=${maxPoolSize}`
      );
      throw new Db2Error("Invalid pool size configuration.");
    }

    const activeConnections = this.getActiveConnectionsCount();

    this.logger.log(
      `Checking pool load: ${activeConnections} active connections.`
    );

    // Check if the active connections exceed the threshold
    if (activeConnections > activeConnectionsThreshold) {
      // Log the decision before making changes
      this.logger.warn(
        `Active connections (${activeConnections}) exceeded threshold (${activeConnectionsThreshold}). Adjusting pool size: min=${minPoolSize}, max=${maxPoolSize}`
      );

      try {
        // Gracefully drain the current pool
        await this.drainPool();

        this.setPoolSize(minPoolSize, maxPoolSize);

        // Reconnect the pool
        await this.connect(); // Reconnect with new settings
        this.logger.log(
          `Successfully adjusted pool size and reconnected: min=${minPoolSize}, max=${maxPoolSize}`
        );
      } catch (error) {
        this.logger.error(
          "Failed to adjust pool size or reconnect dynamically:",
          error.message
        );
        throw new Db2Error("Failed to adjust pool size dynamically.");
      }
    } else {
      this.logger.log(
        `Active connections (${activeConnections}) within acceptable limits. No pool size adjustment necessary.`
      );
    }
  }

  /**
   * Periodically checks the connection pool status and logs it.
   * Dynamically adjusts the pool size based on active connection thresholds.
   * @param interval The interval in milliseconds at which to check the pool status.
   */
  private startPoolMonitoring(interval: number = 10000): void {
    setInterval(() => {
      this.logPoolStatus();

      const activeConnections = this.getActiveConnectionsCount();
      const totalConnections = this.getTotalConnectionsCount();
      const maxPoolSize = this.config.maxPoolSize || 10;

      // Generate warnings if pool is near capacity
      if (totalConnections >= maxPoolSize * 0.9) {
        this.logger.warn(
          `Connection pool usage is at 90% of its capacity (${totalConnections}/${maxPoolSize}). Consider increasing the pool size.`
        );
      }

      // Dynamically adjust the pool size if active connections exceed a threshold
      const activeConnectionsThreshold = 5;
      const newMinPoolSize = Math.min(10, activeConnections + 2);
      const newMaxPoolSize = Math.min(20, activeConnections + 5);

      if (activeConnections > activeConnectionsThreshold) {
        this.adjustPoolSizeBasedOnLoad(
          activeConnectionsThreshold,
          newMinPoolSize,
          newMaxPoolSize
        );
      }
    }, interval);
  }

  /**
   * Retries a database operation based on the configured retry policy.
   * @param operation The operation to retry.
   * @returns A promise that resolves with the result of the operation.
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    const retryPolicy = this.config.retry?.retryPolicy || "none";
    const retryAttempts =
      this.config.retry?.connectionRetries ||
      this.config.retry?.retryAttempts ||
      3;
    const retryInterval =
      this.config.retry?.retryDelay || this.config.retry?.retryInterval || 1000;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        return await operation(); // Try to perform the operation
      } catch (error) {
        if (retryPolicy === "none" || attempt === retryAttempts) {
          throw error; // No retry or maximum attempts reached, throw error
        }

        this.logger.warn(
          `Attempt ${attempt} failed. Retrying in ${retryInterval}ms...`,
          error.message
        );

        if (retryPolicy === "simple") {
          await this.sleep(retryInterval);
        } else if (retryPolicy === "exponentialBackoff") {
          await this.sleep(retryInterval * Math.pow(2, attempt - 1)); // Exponential backoff
        }
      }
    }

    throw new Db2Error("Operation failed after maximum retry attempts.");
  }

  /**
   * Sleeps for a specified duration.
   * @param ms The duration in milliseconds.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Checks if the connection has been idle for too long and closes it if necessary.
   * If the connection is closed due to inactivity, it attempts to reconnect.
   */
  private async checkIdleTimeout(): Promise<void> {
    const idleTimeout = this.config.idleTimeout || 60000; // Default to 60 seconds
    const now = Date.now();

    if (this.connection && now - this.lastUsed > idleTimeout) {
      this.logger.warn(
        `Idle timeout reached (${idleTimeout} ms), closing connection...`
      );

      try {
        await this.disconnect();
        this.logger.log("Connection closed due to idle timeout.");

        // Attempt to reconnect after disconnecting
        this.logger.log("Attempting to reconnect after idle timeout...");
        await this.reconnect();
        this.logger.log("Reconnection successful after idle timeout.");
      } catch (error) {
        const errorMessage = formatDb2Error(error, "Idle Timeout Check", {
          host: this.config.host,
          database: this.config.database,
          idleTimeout,
        });
        this.logger.error(
          `Failed to handle idle timeout properly: ${errorMessage}`
        );
        throw new Db2Error(
          "Failed to handle idle timeout. Check logs for details."
        );
      }
    }
  }

  /**
   * Executes a prepared statement on the Db2 database.
   * @param sql The SQL query string to execute.
   * @param params An array of parameters to bind to the query.
   * @returns A promise that resolves with the result of the query.
   */
  async executePreparedStatement<T>(
    sql: string,
    params: any[] = []
  ): Promise<T> {
    this.logger.log(`Executing prepared statement: ${sql}`);
    if (!this.connection) {
      this.logger.warn(
        "No active connection to execute the prepared statement. Attempting to reconnect..."
      );
      await this.reconnect();
    }

    return new Promise<T>((resolve, reject) => {
      this.connection.prepare(sql, (err, stmt) => {
        if (err) {
          this.logger.error("Error preparing statement:", err.message);
          reject(new Db2Error("Failed to prepare statement"));
          return;
        }

        stmt.execute(params, (error, result) => {
          if (error) {
            this.logger.error(
              "Error executing prepared statement:",
              error.message
            );
            reject(new Db2Error("Prepared statement execution failed"));
          } else {
            resolve(result);
            stmt.closeSync();
          }
        });
      });
    });
  }

  /**
   * Begins a database transaction.
   * @throws Db2Error if no active connection is available or transaction initiation fails.
   */
  async beginTransaction(): Promise<void> {
    if (this.state !== Db2ConnectionState.CONNECTED) {
      this.logger.error("Cannot begin transaction. No active connection.");
      throw new Db2Error("Cannot begin transaction. No active connection.");
    }

    this.logger.log("Beginning transaction...");

    try {
      // Initiate the transaction by sending the SQL command to start it
      await this.query("BEGIN");

      // Log success and state change
      this.logger.log("Transaction started successfully.");
    } catch (error) {
      // Log the error with detailed context and rethrow a Db2Error
      const errorMessage = formatDb2Error(error, "Begin Transaction", {
        host: this.config.host,
        database: this.config.database,
      });
      this.logger.error(`Failed to begin transaction: ${errorMessage}`);
      throw new Db2Error(
        "Failed to begin transaction. Check logs for details."
      );
    }
  }

  /**
   * Commits the current transaction.
   * @throws Db2Error if no active connection is available or the commit operation fails.
   */
  async commitTransaction(): Promise<void> {
    if (this.state !== Db2ConnectionState.CONNECTED) {
      this.logger.error("Cannot commit transaction. No active connection.");
      throw new Db2Error("Cannot commit transaction. No active connection.");
    }

    this.logger.log("Committing transaction...");

    try {
      // Execute the commit command
      await this.query("COMMIT");

      // Log success
      this.logger.log("Transaction committed successfully.");
    } catch (error) {
      // Log the error with detailed context and rethrow a Db2Error
      const errorMessage = formatDb2Error(error, "Commit Transaction", {
        host: this.config.host,
        database: this.config.database,
      });
      this.logger.error(`Failed to commit transaction: ${errorMessage}`);
      throw new Db2Error(
        "Failed to commit transaction. Check logs for details."
      );
    }
  }

  /**
   * Rolls back the current transaction.
   * @throws Db2Error if no active connection is available or the rollback operation fails.
   */
  async rollbackTransaction(): Promise<void> {
    if (this.state !== Db2ConnectionState.CONNECTED) {
      this.logger.error("Cannot rollback transaction. No active connection.");
      throw new Db2Error("Cannot rollback transaction. No active connection.");
    }

    this.logger.log("Rolling back transaction...");

    try {
      // Execute the rollback command
      await this.query("ROLLBACK");

      // Log success
      this.logger.log("Transaction rolled back successfully.");
    } catch (error) {
      // Log the error with detailed context and rethrow a Db2Error
      const errorMessage = formatDb2Error(error, "Rollback Transaction", {
        host: this.config.host,
        database: this.config.database,
      });
      this.logger.error(`Failed to rollback transaction: ${errorMessage}`);
      throw new Db2Error(
        "Failed to rollback transaction. Check logs for details."
      );
    }
  }

  // src/db/db2-client.ts

  /**
   * Checks the health status of the Db2 connection.
   * @returns A promise that resolves with a boolean indicating the health of the connection.
   */
  async checkHealth(): Promise<boolean> {
    this.logger.log("Performing extended health check...");

    // Check the connection state
    if (this.state !== Db2ConnectionState.CONNECTED) {
      this.logger.warn("No active connection. Attempting to reconnect...");
      await this.reconnect();
    }

    // Execute a simple query to test the connection
    const testQuery =
      this.config.connectionTestQuery || "SELECT 1 FROM SYSIBM.SYSDUMMY1";
    try {
      await this.query(testQuery);
    } catch (error) {
      this.state = Db2ConnectionState.ERROR;
      this.logger.error("Health check failed:", error.message);
      await this.reconnect();
      return false;
    }

    // Check the state of the connection pool
    const activeConnections = this.getActiveConnectionsCount();
    const totalConnections = this.getTotalConnectionsCount();

    if (activeConnections > totalConnections * 0.9) {
      this.logger.warn(
        `Connection pool usage is high: ${activeConnections}/${totalConnections} active connections.`
      );
    }

    this.logger.log("Health check passed.");
    return true;
  }

  /**
   * Returns the current state of the connection.
   * @returns The current connection state.
   */
  public getState(): Db2ConnectionState {
    return this.state;
  }

  public getActiveConnectionsCount(): number {
    try {
      // Check if the pool has a method to get active connections count
      if (typeof this.pool.getPoolStatus === "function") {
        const poolStatus = this.pool.getPoolStatus();
        const activeConnections = poolStatus?.availablePoolSize || 0;

        this.logger.debug(`Current active connections: ${activeConnections}`);
        return activeConnections;
      }

      this.logger.warn(
        "Active connections count could not be determined. Falling back to default logic."
      );

      // Manual tracking of active connections if pool method is not available
      return this.connection ? 1 : 0;
    } catch (error) {
      this.logger.error(
        "Failed to get active connections count:",
        error.message
      );
      throw new Db2Error("Error retrieving the number of active connections.");
    }
  }

  /**
   * Returns the total number of connections in the pool.
   * Logs the total connection count for monitoring purposes.
   * @returns The total number of connections in the pool.
   */
  public getTotalConnectionsCount(): number {
    try {
      // Safely check for pool and connections before accessing their properties
      const activeConnections = this.pool?.activeConnections?.length || 0;
      const idleConnections = this.pool?.idleConnections?.length || 0;
      const totalConnections = activeConnections + idleConnections;

      this.logger.log(
        `Total connections in the pool: ${totalConnections} (Active: ${activeConnections}, Idle: ${idleConnections})`
      );

      return totalConnections;
    } catch (error) {
      this.logger.error(
        "Error retrieving total connections count:",
        error.message
      );

      // Return 0 as a fallback in case of error
      return 0;
    }
  }

  /**
   * Drains the connection pool by closing all active connections.
   * If a specific connection is open, it closes that first and then clears the entire pool.
   */
  async drainPool(): Promise<void> {
    try {
      this.logger.log("Draining the connection pool...");

      // Check and close the current connection
      if (this.connection) {
        this.logger.log(
          "Closing current active connection before draining the pool."
        );
        await this.disconnect();
      }

      // Close all connections in the pool
      this.pool.closeAll((err) => {
        if (err) {
          this.logger.error(
            "Error while draining the connection pool:",
            err.message
          );
          throw new Db2Error("Failed to drain the connection pool.");
        } else {
          this.logger.log(
            "All connections in the pool have been successfully drained."
          );
        }
      });
    } catch (error) {
      // Handle any errors that occur during the draining process
      this.logger.error("Error during pool draining operation:", error.message);
      throw new Db2Error(
        "An error occurred while draining the connection pool."
      );
    }
  }

  /**
   * Builds the connection string based on Db2ConfigOptions.
   */
  // src/db/db2-client.ts

  public buildConnectionString(config: Db2ConfigOptions): string {
    const {
      host,
      port,
      database,
      characterEncoding,
      securityMechanism,
      currentSchema,
      applicationName,
      useTls,
      sslCertificatePath,
    } = config;

    const { username, password } = config.auth || {};

    let connStr = `DATABASE=${database};HOSTNAME=${host};PORT=${port};`;

    if (username && password) {
      connStr += `UID=${username};PWD=${password};`;
    }

    if (characterEncoding) {
      connStr += `CHARACTERENCODING=${characterEncoding};`;
    }

    if (securityMechanism) {
      connStr += `SECURITY=${securityMechanism};`;
    }

    if (currentSchema) {
      connStr += `CURRENTSCHEMA=${currentSchema};`;
    }

    if (applicationName) {
      connStr += `APPLICATIONNAME=${applicationName};`;
    }

    if (useTls) {
      connStr += "SECURITY=SSL;";
      if (sslCertificatePath) {
        connStr += `SSLServerCertificate=${sslCertificatePath};`;
      }
    }

    return connStr;
  }

  private startConnectionLifetimeCheck() {
    const maxLifetime = this.config.maxLifetime || 1800000; // Default to 30 minutes
    setInterval(async () => {
      if (this.connection && Date.now() - this.lastUsed > maxLifetime) {
        this.logger.log("Max connection lifetime reached, cycling connection.");
        await this.disconnect();
        await this.connect();
      }
    }, maxLifetime);
  }

  private stopConnectionLifetimeCheck() {
    if (this.connectionLifetimeInterval) {
      clearInterval(this.connectionLifetimeInterval);
      this.logger.log("Stopped connection lifetime check.");
    }
  }

  /**
   * Dynamically sets the minimum and maximum pool size for the database connections.
   * Validates the inputs and ensures that the pool is adjusted accordingly.
   * @param minPoolSize The minimum number of connections in the pool.
   * @param maxPoolSize The maximum number of connections in the pool.
   * @throws Db2Error if the provided pool sizes are invalid.
   */
  public setPoolSize(minPoolSize: number, maxPoolSize: number): void {
    try {
      // Validate pool sizes
      if (minPoolSize < 1) {
        throw new Db2Error("Minimum pool size must be at least 1.");
      }
      if (maxPoolSize < minPoolSize) {
        throw new Db2Error(
          "Maximum pool size must be greater than or equal to the minimum pool size."
        );
      }

      // Log current pool sizes for comparison
      const currentMinSize = this.pool.minPoolSize || "default";
      const currentMaxSize = this.pool.maxPoolSize || "default";

      this.logger.log(
        `Adjusting connection pool size: current min=${currentMinSize}, current max=${currentMaxSize}, ` +
          `new min=${minPoolSize}, new max=${maxPoolSize}`
      );

      // Update the pool configuration
      this.pool.setMaxPoolSize(maxPoolSize);
      this.pool.setMinPoolSize(minPoolSize);

      // Confirm the update
      this.logger.log(
        `Connection pool size updated successfully: min=${minPoolSize}, max=${maxPoolSize}`
      );
    } catch (error) {
      this.logger.error("Failed to set pool size:", error.message);
      throw new Db2Error("An error occurred while setting the pool size.");
    }
  }
}
