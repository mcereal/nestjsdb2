import { Pool, Connection } from "ibm_db";
import * as ibm_db from "ibm_db";
import { Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  Db2AuthOptions,
  Db2ClientInterface,
  Db2ClientState,
  Db2ConfigOptions,
} from "../interfaces";
import { Db2ConnectionState } from "../enums";
import {
  Db2ConnectionError,
  Db2Error,
  Db2PoolError,
  Db2TransactionError,
  formatDb2Error,
  handleDb2Error,
} from "../errors";
import { Db2AuthStrategy } from "../auth/db2-auth.strategy";
import { createAuthStrategy } from "../auth/auth-factory";

export class Db2Client
  implements Db2ClientInterface, OnModuleInit, OnModuleDestroy
{
  protected readonly config: Db2ConfigOptions;
  protected readonly authConfig: Db2AuthOptions;
  protected readonly authStrategy: Db2AuthStrategy;
  protected readonly logger = new Logger(Db2Client.name);
  private pool: Pool | null = null; // Mark the pool as nullable
  protected connection: Connection | null = null; // Mark the connection as nullable
  protected state: Db2ConnectionState = Db2ConnectionState.DISCONNECTED; // Default state
  private idleTimeoutInterval: NodeJS.Timeout; // Track idle timeout
  private connectionLifetimeInterval: NodeJS.Timeout; // Track connection lifetime
  private activeConnections: Connection[] = []; // Track active connections
  private totalConnections = 0; // Total number of connections ever opened
  private reconnectionAttempts = 0; // Track the number of reconnection attempts
  private recentErrors: string[] = []; // Track recent errors
  protected lastUsed: number = Date.now(); // Track the last time the connection was used
  protected poolInitialized = false; // To check if pool is initialized
  private currentReconnectAttempts: number; // Track current reconnection attempts
  idleConnections: number;

  public constructor(config: Db2ConfigOptions) {
    this.config = {
      ...config,
      retry: {
        maxReconnectAttempts: config.retry?.maxReconnectAttempts ?? 3, // Default to 3 attempts
        reconnectInterval: config.retry?.reconnectInterval ?? 5000, // Default to 5 seconds
      },
      connectionTimeout: config.connectionTimeout ?? 30000, // Default to 30 seconds
      minPoolSize: config.minPoolSize ?? 1, // Default to 1 connection
      maxPoolSize: config.maxPoolSize ?? 10, // Default to 10 connections
      idleTimeout: config.idleTimeout ?? 60000, // Default to 1 minute
      maxLifetime: config.maxLifetime ?? 1800000, // Default to 30 minutes
      autoCommit: config.autoCommit ?? true, // Default to auto-commit
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
  }

  public async onModuleInit() {
    await this.initializePool();
  }

  public onModuleDestroy() {
    this.drainPool();
  }
  async drainPool(): Promise<void> {
    this.logger.log(` Draining the connection pool...`);

    try {
      this.stopIdleTimeoutCheck();
      this.stopConnectionLifetimeCheck();
      await this.closePool();
    } catch (error) {
      this.logger.error("Error during shutdown:", error.message);
    }
  }

  public async closePool(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.logger.log("Closing DB2 connection pool...");
      this.setState(Db2ConnectionState.DISCONNECTING);

      this.pool.close((err) => {
        if (err) {
          this.setState(Db2ConnectionState.ERROR);
          this.logger.error("Error closing DB2 connection pool", err);
          reject(new Db2ConnectionError("Failed to close DB2 connection pool"));
        } else {
          this.setState(Db2ConnectionState.DISCONNECTED);
          this.logger.log("DB2 connection pool closed successfully");
          resolve();
        }
      });
    });
  }

  public openConnection(isInitialization = false): Promise<Connection> {
    return new Promise<Connection>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Db2ConnectionError("Connection attempt timed out"));
      }, this.config.connectionTimeout);

      this.pool.open(
        this.buildConnectionString(this.config),
        (err: Error, connection: Connection) => {
          clearTimeout(timeout);
          if (err) {
            this.logger.error("DB2 connection failed", err);
            reject(new Db2ConnectionError("Failed to open DB2 connection"));
          } else {
            if (!isInitialization) {
              // Only log for non-initialization connections
              this.logger.log("DB2 connection opened successfully");
            }
            this.connection = connection;
            this.lastUsed = Date.now();

            this.activeConnections.push(connection); // Track active connection
            this.totalConnections++;

            resolve(connection);
          }
        }
      );
    });
  }

  /**
   * Initialize the connection pool with configurable options, including `minPoolSize`
   */
  private async initializePool(): Promise<void> {
    try {
      this.logger.log("Initializing DB2 connection pool...");

      this.setState(Db2ConnectionState.CONNECTING);

      this.logger.log(
        `Connecting to DB2 at ${this.config.host}:${this.config.port}/${this.config.database}`
      );

      this.pool = new ibm_db.Pool();
      this.pool.init(
        this.config.maxPoolSize,
        this.buildConnectionString(this.config)
      );

      // Pre-populate the pool with minPoolSize connections
      for (let i = 0; i < this.config.minPoolSize; i++) {
        const connection = await this.openConnection(true); // Initialization flag to suppress logging
        await this.closeConnection(connection);
      }

      this.poolInitialized = true;
      this.setState(Db2ConnectionState.CONNECTED);
      this.logger.log(
        `DB2 connection pool initialized with at least ${this.config.minPoolSize} active connections`
      );

      // Start idle timeout and connection lifetime checks for the entire pool
      this.startIdleTimeoutCheck();
      this.startConnectionLifetimeCheck();
    } catch (error) {
      handleDb2Error(
        error,
        "Failed to initialize connection pool",
        {
          host: this.config.host,
          database: this.config.database,
        },
        this.logger
      );
      throw new Db2ConnectionError("Failed to initialize DB2 connection pool");
    }
  }

  /**
   * Set the DB2 connection state
   */
  public setState(state: Db2ConnectionState): void {
    this.state = state;
    this.logger.log(`Db2 connection state changed to: ${state}`);
  }

  /**
   * Get the DB2 connection state
   */
  public getState(): Db2ClientState {
    return {
      connectionState: this.state,
      activeConnections: this.activeConnections.length,
      totalConnections: this.totalConnections,
      reconnectionAttempts: this.reconnectionAttempts,
      recentErrors: this.recentErrors,
      lastUsed: new Date(this.lastUsed).toISOString(),
      poolInitialized: this.poolInitialized,
    };
  }

  private startConnectionLifetimeCheck(): void {
    const maxLifetime = 1800000; // 30 minutes in milliseconds
    this.connectionLifetimeInterval = setInterval(async () => {
      if (this.connection && Date.now() - this.lastUsed > maxLifetime) {
        this.logger.log("Max connection lifetime reached, cycling connection.");
        await this.disconnect();
        this.connection = await this.openConnection;
      }
    }, maxLifetime);
  }

  private stopConnectionLifetimeCheck(): void {
    if (this.connectionLifetimeInterval) {
      clearInterval(this.connectionLifetimeInterval);
      this.connectionLifetimeInterval = undefined;
      this.logger.log("Stopped connection lifetime check.");
    }
  }

  private async getConnectionFromPool(connStr: string): Promise<Connection> {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        reject(new Db2PoolError("Acquire connection timeout"));
      }, this.config.connectionTimeout);

      this.pool.open(connStr, (err, connection) => {
        clearTimeout(timeoutHandle);
        if (err) {
          this.logger.error(
            "Error acquiring connection from pool:",
            err.message
          );
          reject(new Db2PoolError("Failed to acquire connection from pool"));
        } else {
          resolve(connection);
        }
      });
    });
  }

  private async handleConnectionError(error: Error): Promise<void> {
    this.logger.error(`Connection error: ${error.message}`);
    this.currentReconnectAttempts++;

    if (
      this.currentReconnectAttempts > this.config.retry?.maxReconnectAttempts
    ) {
      this.logger.error("Maximum reconnect attempts reached.");
      throw new Db2ConnectionError("All reconnection attempts failed.");
    }

    await this.sleep(this.config.retry?.reconnectInterval || 5000);
    await this.openConnection;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Additional methods (e.g., disconnect, query, etc.) remain unchanged

  private startIdleTimeoutCheck() {
    const idleTimeoutCheckInterval = 10000; // Check every 10 seconds
    this.idleTimeoutInterval = setInterval(() => {
      this.checkIdleTimeout();
    }, idleTimeoutCheckInterval);
    this.logger.log("Started idle timeout checks.");
  }

  private stopIdleTimeoutCheck() {
    if (this.idleTimeoutInterval) {
      clearInterval(this.idleTimeoutInterval);
      this.logger.log("Stopped idle timeout checks.");
    }
  }

  private async checkIdleTimeout(): Promise<void> {
    const { idleTimeout } = this.config;
    const now = Date.now();

    if (this.connection && now - this.lastUsed > idleTimeout) {
      this.logger.warn(
        `Idle timeout reached (${idleTimeout} ms), closing connection...`
      );

      try {
        await this.disconnect();
        this.logger.log("Connection closed due to idle timeout.");

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
   * Closes the connection to the Db2 database and releases it back to the pool.
   */
  public async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        this.logger.log("Disconnecting from DB2 database...");
        await this.closeConnection(this.connection);

        // Ensure the connection is properly set to null
        this.connection = null;
        this.setState(Db2ConnectionState.DISCONNECTED);

        this.logger.log("Db2 database connection closed and reset to null.");

        // Stop the idle timeout and lifetime checks after disconnection
        this.stopIdleTimeoutCheck();
        this.stopConnectionLifetimeCheck();
      } catch (error) {
        this.setState(Db2ConnectionState.ERROR);
        this.logError("Error disconnecting from Db2 database", error);
        throw new Db2ConnectionError("Failed to disconnect from Db2 database");
      }
    } else {
      this.logger.warn("No active connection to disconnect.");
    }
  }

  /**
   * Close the individual connection
   */
  public async closeConnection(connection: Connection): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (connection) {
        this.logger.log("Closing DB2 connection...");
        connection.close((err) => {
          if (err) {
            this.logger.error("Error closing DB2 connection", err);
            reject(new Db2ConnectionError("Failed to close DB2 connection"));
          } else {
            this.logger.log("DB2 connection closed successfully");

            // Remove the connection from the array
            const index = this.activeConnections.indexOf(connection);
            if (index > -1) {
              this.activeConnections.splice(index, 1);
            } else {
              this.logger.warn(
                "Attempted to close a connection that was not in the active connections array"
              );
            }

            resolve();
          }
        });
      } else {
        this.logger.warn("No connection to close");
        resolve();
      }
    });
  }

  /**
   * Reconnect logic for the Db2 client.
   * Attempts to re-establish a connection using the existing configuration.
   */
  private async reconnect(): Promise<void> {
    if (
      this.state !== Db2ConnectionState.CONNECTED &&
      this.state !== Db2ConnectionState.RECONNECTING
    ) {
      try {
        this.logger.log("Attempting to reconnect to DB2...");
        this.setState(Db2ConnectionState.RECONNECTING);
        this.reconnectionAttempts += 1;
        const connection = await this.openConnection();
        await this.closeConnection(connection);
        this.logger.log("Reconnection successful");
        this.setState(Db2ConnectionState.CONNECTED);
      } catch (error) {
        this.logger.error("Reconnection failed:", error);
        this.recentErrors.push(error.message);
        this.setState(Db2ConnectionState.ERROR);
      }
    }
  }

  /**
   * Executes a SQL query against the Db2 database.
   * @param sql The SQL query string to execute.
   * @param params An array of parameters to bind to the query.
   * @returns A promise that resolves with the result of the query.
   */
  public async query(query: string, params: any[] = []): Promise<any> {
    const connection = await this.openConnection();
    try {
      this.logger.log(`Executing query: ${query}`);
      return new Promise<any>((resolve, reject) => {
        connection.query(query, params, (err: Error, result: any) => {
          if (err) {
            this.logger.error("Error executing query", err);
            reject(new Db2ConnectionError("Failed to execute query"));
          } else {
            resolve(result);
          }
        });
      });
    } finally {
      await this.closeConnection(connection);
    }
  }

  /**
   * Builds the connection string based on Db2ConfigOptions.
   */
  public buildConnectionString(config: Db2ConfigOptions): string {
    let connStr = `DATABASE=${config.database};HOSTNAME=${config.host};PORT=${config.port};`;

    if (config.characterEncoding) {
      connStr += `CHARACTERENCODING=${config.characterEncoding};`;
    }
    if (config.securityMechanism) {
      connStr += `SECURITY=${config.securityMechanism};`;
    }
    if (config.useTls) {
      connStr += "SECURITY=SSL;";
    }
    if (config.username && config.password) {
      connStr += `UID=${config.username};PWD=${config.password};`;
    }

    return connStr;
  }

  /**
   * Executes a batch insert operation on the Db2 database.
   * @param tableName The name of the table to insert into.
   * @param columns The columns to insert data into.
   * @param valuesArray An array of value arrays, each containing values for a single row.
   * @returns A promise that resolves when the batch insert is complete.
   */
  public async batchInsert(
    tableName: string,
    columns: string[],
    valuesArray: any[][]
  ): Promise<void> {
    this.logger.log(`Starting batch insert into table: ${tableName}`);

    const columnsString = columns.join(", ");
    const placeholders = columns.map(() => "?").join(", ");
    const sql = `INSERT INTO ${tableName} (${columnsString}) VALUES (${placeholders})`;

    const stmt = this.connection.prepareSync(sql);
    for (const values of valuesArray) {
      stmt.executeSync(values);
    }
    stmt.closeSync();
    this.logger.log(`Batch insert completed for table: ${tableName}`);
  }

  /**
   * Executes a prepared statement on the Db2 database.
   * @param sql The SQL query string to execute.
   * @param params An array of parameters to bind to the query.
   * @returns A promise that resolves with the result of the query.
   */
  public async executePreparedStatement<T>(
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
   * Executes a transaction.
   * @param callback The function to execute within the transaction.
   */
  public async executeTransaction(
    callback: () => Promise<void>
  ): Promise<void> {
    await this.beginTransaction();
    try {
      await callback();
      await this.commitTransaction();
    } catch (error) {
      await this.rollbackTransaction();
      throw error; // Rethrow the error after rollback
    }
  }

  /**
   * Begins a transaction.
   */
  public async beginTransaction(): Promise<void> {
    if (this.state !== Db2ConnectionState.CONNECTED) {
      throw new Db2Error("Cannot begin transaction. No active connection.");
    }
    await this.query("BEGIN");
    this.logger.log("Transaction started successfully.");
  }

  /**
   * Commits the current transaction.
   */
  public async commitTransaction(): Promise<void> {
    if (this.state !== Db2ConnectionState.CONNECTED) {
      throw new Db2Error("Cannot commit transaction. No active connection.");
    }
    await this.query("COMMIT");
    this.logger.log("Transaction committed successfully.");
  }

  /**
   * Rolls back the current transaction.
   */
  public async rollbackTransaction(): Promise<void> {
    if (this.state !== Db2ConnectionState.CONNECTED) {
      throw new Db2Error("Cannot rollback transaction. No active connection.");
    }
    await this.query("ROLLBACK");
    this.logger.log("Transaction rolled back successfully.");
  }

  public async batchUpdate(
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
      throw new Db2TransactionError("Batch update failed");
    }
  }

  private logError(message: string, error: Error) {
    const logMessage = `${message}: ${error.message}`;
    this.logger.error(logMessage);
    this.recentErrors.push(logMessage); // Add to recent errors
    if (this.recentErrors.length > 10) {
      // Limit recent errors to the last 10
      this.recentErrors.shift();
    }
  }

  public getActiveConnectionsCount(): number {
    try {
      const activeConnections = this.activeConnections?.length || 0;
      this.logger.log(`Active connections: ${activeConnections}`);
      return activeConnections;
    } catch (error) {
      this.logger.error(
        "Failed to get active connections count:",
        error.message
      );
    }
  }

  /**
   * Logs the current pool status, including active and idle connections.
   */
  public logPoolStatus(): void {
    const activeConnections = this.getActiveConnectionsCount();

    this.logger.log(`Connection Pool Status: Active=${activeConnections}`);
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

      const maxPoolSize = this.config.maxPoolSize || 10;

      // Generate warnings if pool is near capacity
      if (activeConnections >= maxPoolSize * 0.9) {
        this.logger.warn(
          `Connection pool usage is at 90% of its capacity (${activeConnections}/${maxPoolSize}). Consider increasing the pool size.`
        );
      }
    }, interval);
  }

  /**
   * Get connection pool statistics
   */
  public getPoolStats() {
    return {
      activeConnections: this.activeConnections,
      totalConnections: this.totalConnections,
      minPoolSize: this.config.minPoolSize,
      maxPoolSize: this.config.maxPoolSize,
    };
  }

  /**
   * Check the health status of the DB2 connection, including pool and connection stats
   */
  public async checkHealth(): Promise<{
    status: boolean;
    details?: any;
  }> {
    this.logger.log("Performing extended health check...");
    try {
      // Execute a test query
      await this.query("SELECT 1 FROM SYSIBM.SYSDUMMY1");
      this.logger.log("DB2 base health check passed");

      // Get pool and connection stats
      const poolStats = this.getPoolStats();
      const connectionStats = await this.getDbConnectionStats();

      // Attempt to get detailed connection info, but don't fail if it doesn't work
      let connectionDetails: any;
      try {
        connectionDetails = await this.getDbConnectionDetails();
      } catch (error) {
        this.logger.warn(
          "Failed to retrieve detailed connection info, skipping."
        );
        connectionDetails = { error: "Connection details unavailable" };
      }

      return {
        status: true,
        details: {
          poolStats,
          connectionStats,
          connectionDetails,
        },
      };
    } catch (error) {
      this.logger.error("DB2 health check failed:", error);
      return {
        status: false,
        details: {
          error: error.message,
        },
      };
    }
  }

  public async getDbConnectionStats(): Promise<any> {
    const query = `
      SELECT
        SUBSTR(APPLICATION_NAME, 1, 40) AS APP_NAME,
        COUNT(*) AS CONNECTION_COUNT
      FROM SYSIBMADM.MON_CURRENT_SQL
      GROUP BY APPLICATION_NAME
    `;

    try {
      const result = await this.query(query);
      return result;
    } catch (error) {
      this.logger.error("Failed to get DB connection stats:", error);
      throw new Db2Error("Failed to get DB connection stats");
    }
  }

  /**
   * Get DB2 connection details from the system catalog
   */
  public async getDbConnectionDetails(): Promise<any> {
    this.logger.log("Getting DB connection details...");

    const query = `
        SELECT 
          AGENT_ID,
          APPL_CON_TIME,
          APPL_IDLE_TIME,
          LOCKS_HELD,
          AGENT_SYS_CPU_TIME_MS,
          AGENT_USR_CPU_TIME_MS,
          DIRECT_READS,
          DIRECT_WRITES,
          COMMIT_SQL_STMTS,
          ROLLBACK_SQL_STMTS,
          FAILED_SQL_STMTS
        FROM SYSIBMADM.SNAPAPPL
        WHERE AGENT_ID IS NOT NULL
      `;

    try {
      const connection = await this.openConnection();
      this.logger.log("Executing query: " + query);

      return new Promise<any>((resolve, reject) => {
        connection.query(query, (err: Error, result: any) => {
          if (err) {
            this.logger.error("Error executing query", err);
            reject(new Db2ConnectionError("Failed to execute query"));
          } else {
            this.logger.log("DB2 connection details retrieved successfully");
            resolve(result);
          }
        });
      });
    } catch (error) {
      this.logger.error("Failed to get DB connection details:", error);
      throw new Db2Error("Failed to get DB connection details");
    } finally {
      await this.closeConnection(this.connection);
    }
  }
}
