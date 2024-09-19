import { Pool, Connection } from "ibm_db";
import { Inject, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  Db2AuthOptions,
  IDb2Client,
  Db2ClientState,
  IDb2ConfigOptions,
  Db2ConnectionDetails,
  Db2ConnectionStats,
  Db2HealthDetails,
  Db2PoolStats,
  IPoolManager,
} from "../interfaces";
import { Db2ConnectionState } from "../enums";
import {
  Db2ConnectionError,
  Db2Error,
  Db2TransactionError,
  formatDb2Error,
  handleDb2Error,
} from "../errors";
import { Db2AuthStrategy } from "../auth/db2-auth.strategy";
import { Db2ConfigManager } from "./db2-config.manager";
import { Db2AuthManager } from "./db2-auth.manager";
import { IConnectionManager } from "../interfaces/connection-mannager.interface";
import { Db2PoolManager } from "./db2-pool.manager";
import { DB2_CONFIG } from "../constants/injection-token.constant";
import { buildConnectionString } from "../utils/buildConnectionString";

export class Db2Client
  implements IConnectionManager, IDb2Client, OnModuleInit, OnModuleDestroy
{
  protected readonly config: IDb2ConfigOptions;
  protected readonly authConfig: Db2AuthOptions;
  protected readonly authStrategy: Db2AuthStrategy;
  protected readonly authManager: Db2AuthManager;
  readonly logger = new Logger(Db2Client.name);
  private pool: Pool;
  protected connection?: Connection;
  protected state: Db2ClientState = {
    connectionState: Db2ConnectionState.DISCONNECTED,
    activeConnections: 0,
    totalConnections: 0,
    reconnectionAttempts: 0,
    recentErrors: [],
    lastUsed: new Date().toISOString(),
    poolInitialized: false,
  };
  private idleTimeoutInterval: NodeJS.Timeout;
  private activeConnectionsList: Connection[] = [];
  private totalConnections = 0;
  private reconnectionAttempts = 0;
  private recentErrors: string[] = [];
  protected lastUsed: number = Date.now();
  protected poolInitialized = false;
  private currentReconnectAttempts: number = 0;
  private idleConnections: number = 0;

  public constructor(
    @Inject(DB2_CONFIG) // Inject the config
    config: IDb2ConfigOptions,
    private readonly connectionManager: IConnectionManager,
    private poolManager: IPoolManager
  ) {
    const configManager = new Db2ConfigManager(config);
    this.config = configManager.getConfig();

    this.authManager = new Db2AuthManager(this.config, connectionManager, this);
    this.poolManager = new Db2PoolManager(this.config);
  }

  public async onModuleInit(): Promise<void> {
    try {
      await this.poolManager.init(); // Initialize the pool
      this.pool = this.poolManager.getPool; // Assign the pool instance
      this.connectionManager.setState({
        poolInitialized: true,
        connectionState: Db2ConnectionState.CONNECTED,
      });
      this.logger.log("Db2 client module initialized successfully.");
      this.startIdleTimeoutCheck(); // Start idle timeout checks after initialization
    } catch (error) {
      this.setState({ connectionState: Db2ConnectionState.ERROR });
      this.logger.error("Error during Db2 client initialization:", error);
      throw error; // Re-throw to propagate the error
    }
  }

  public onModuleDestroy(): void {
    this.drainPool();
    this.setState({ connectionState: Db2ConnectionState.DISCONNECTED });
    this.logger.log("Db2 client disconnected and destroyed");
  }

  public async drainPool(): Promise<void> {
    this.setState({ connectionState: Db2ConnectionState.POOL_DRAINING });
    this.logger.log("Draining the connection pool...");

    try {
      this.stopIdleTimeoutCheck();
      await this.poolManager.drainPool(); // Use PoolManager to drain the pool
      this.setState({ connectionState: Db2ConnectionState.POOL_DRAINED });
      this.logger.log("Connection pool drained successfully.");
    } catch (error) {
      this.setState({ connectionState: Db2ConnectionState.ERROR });
      this.logger.error("Error during shutdown:", error.message);
    }
  }

  public async getConnection(): Promise<Connection> {
    const connection = await this.poolManager.getConnection();
    this.activeConnectionsList.push(connection);
    this.totalConnections++;
    this.setState({ activeConnections: this.activeConnectionsList.length });
    return connection;
  }

  public async closePool(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.logger.log("Closing DB2 connection pool...");
      this.setState({ connectionState: Db2ConnectionState.DISCONNECTING });

      this.pool.close((err) => {
        if (err) {
          this.setState({ connectionState: Db2ConnectionState.ERROR });
          this.logger.error("Error closing DB2 connection pool", err);
          reject(new Db2ConnectionError("Failed to close DB2 connection pool"));
        } else {
          this.setState({ connectionState: Db2ConnectionState.POOL_DRAINED });
          this.logger.log("DB2 connection pool closed successfully");
          resolve();
        }
      });
    });
  }

  public async getConnectionFromPool(connectionString: string): Promise<void> {
    if (!this.pool) {
      throw new Db2ConnectionError("Connection pool is not initialized");
    }

    this.connection = await new Promise<Connection>((resolve, reject) => {
      this.pool?.open(connectionString, (err, connection) => {
        if (err) {
          reject(new Db2ConnectionError("Failed to get connection from pool"));
        } else {
          this.idleConnections--; // Decrease idle connections count
          resolve(connection);
        }
      });
    });

    this.logger.log("Connection successfully retrieved from pool");
  }

  public openConnection(isInitialization = false): Promise<Connection> {
    return new Promise<Connection>(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Db2ConnectionError("Connection attempt timed out"));
      }, this.config.connectionTimeout);

      // Authenticate before opening the connection
      await this.authManager.authenticate();

      this.pool.open(
        buildConnectionString(this.config),
        async (err: Error, connection: Connection) => {
          clearTimeout(timeout);
          if (err) {
            this.logger.error("DB2 connection failed", err);
            await this.handleConnectionError(err); // Handle error and retry logic
            reject(new Db2ConnectionError("Failed to open DB2 connection"));
          } else {
            if (!isInitialization) {
              this.logger.log("DB2 connection opened successfully");
            }
            this.connection = connection;
            this.lastUsed = Date.now();
            this.activeConnectionsList.push(connection);
            this.totalConnections++;
            resolve(connection);
          }
        }
      );
    });
  }

  /**
   * Set the DB2 connection state
   */
  public setState(newState: Partial<Db2ClientState>): void {
    this.state = { ...this.state, ...newState };
    this.logger.log(
      `Connection state updated to: ${JSON.stringify(this.state)}`
    );
  }

  /**
   * Get the DB2 connection state
   */
  public getState(): Db2ClientState {
    return this.state;
  }

  private async handleConnectionError(error: Error): Promise<void> {
    this.logger.error(`Connection error: ${error.message}`);
    this.currentReconnectAttempts++;

    if (
      this.currentReconnectAttempts > this.config.retry?.maxReconnectAttempts
    ) {
      this.logger.error("Maximum reconnect attempts reached.");
      this.setState({ connectionState: Db2ConnectionState.ERROR });
      throw new Db2ConnectionError("All reconnection attempts failed.");
    }

    await this.sleep(this.config.retry?.reconnectInterval || 5000);
    await this.openConnection();
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
        this.setState({ connectionState: Db2ConnectionState.DISCONNECTED });

        this.logger.log("Db2 database connection closed and reset to null.");

        // Stop the idle timeout and lifetime checks after disconnection
        this.stopIdleTimeoutCheck();
      } catch (error) {
        this.setState({ connectionState: Db2ConnectionState.ERROR });
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
    await this.poolManager.releaseConnection(connection);
    const index = this.activeConnectionsList.indexOf(connection);
    if (index > -1) {
      this.activeConnectionsList.splice(index, 1);
      this.setState({ activeConnections: this.activeConnectionsList.length });
    }
    this.logger.log("Connection released back to the pool.");
  }

  /**
   * Reconnect logic for the Db2 client.
   * Attempts to re-establish a connection using the existing configuration.
   */
  private async reconnect(): Promise<void> {
    if (
      this.state.connectionState !== Db2ConnectionState.CONNECTED &&
      this.state.connectionState !== Db2ConnectionState.RECONNECTING
    ) {
      try {
        this.logger.log("Attempting to reconnect to DB2...");
        this.setState({ connectionState: Db2ConnectionState.RECONNECTING });
        this.reconnectionAttempts += 1;
        const connection = await this.openConnection();
        await this.closeConnection(connection);
        this.logger.log("Reconnection successful");
        this.setState({ connectionState: Db2ConnectionState.CONNECTED });
      } catch (error) {
        this.logger.error("Reconnection failed:", error);
        this.recentErrors.push(error.message);
        await this.handleConnectionError(error); // Handle the error and retry
        this.setState({ connectionState: Db2ConnectionState.ERROR });
      }
    }
  }

  /**
   * Executes a SQL query against the Db2 database.
   * @param sql The SQL query string to execute.
   * @param params An array of parameters to bind to the query.
   * @returns A promise that resolves with the result of the query.
   */
  public async query<T>(
    query: string,
    params: any[] = [],
    timeout?: number
  ): Promise<T> {
    const connection = await this.openConnection();
    try {
      this.logger.log(`Executing query: ${query}`);

      return new Promise<T>((resolve, reject) => {
        // Apply a query timeout if provided
        const queryTimeout = setTimeout(() => {
          reject(new Db2ConnectionError("Query execution timed out"));
        }, timeout || this.config.queryTimeout);

        connection.query(query, params, (err: Error, result: T) => {
          clearTimeout(queryTimeout); // Clear the timeout once the query resolves
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
    if (this.state.connectionState !== Db2ConnectionState.CONNECTED) {
      throw new Db2Error("Cannot begin transaction. No active connection.");
    }
    await this.query("BEGIN");
    this.logger.log("Transaction started successfully.");
  }

  /**
   * Commits the current transaction.
   */
  public async commitTransaction(): Promise<void> {
    if (this.state.connectionState !== Db2ConnectionState.CONNECTED) {
      throw new Db2Error("Cannot commit transaction. No active connection.");
    }
    await this.query("COMMIT");
    this.logger.log("Transaction committed successfully.");
  }

  /**
   * Rolls back the current transaction.
   */
  public async rollbackTransaction(): Promise<void> {
    if (this.state.connectionState !== Db2ConnectionState.CONNECTED) {
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
      const activeConnections = this.activeConnectionsList?.length || 0;
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
    const idleConnections = this.idleConnections;

    this.logger.log(
      `Connection Pool Status: Active=${activeConnections}, Idle=${idleConnections}`
    );
  }

  /**
   * Get connection pool statistics
   */
  public getPoolStats() {
    return {
      activeConnections: this.activeConnectionsList.length,
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
    details?: Db2HealthDetails;
    error?: string; // Add error at the top-level
  }> {
    this.logger.log("Performing extended health check...");

    try {
      // Execute a test query to verify base health check
      await this.query("SELECT 1 FROM SYSIBM.SYSDUMMY1");
      this.logger.log("DB2 base health check passed");

      // Get pool statistics
      const poolStats: Db2PoolStats = this.getPoolStats();

      // Get connection statistics
      const connectionStats: Db2ConnectionStats =
        await this.getDbConnectionStats();

      // Try to get detailed connection information, but don't fail if this part doesn't work
      let connectionDetails: Db2ConnectionDetails | undefined;
      try {
        connectionDetails = await this.getDbConnectionDetails();
      } catch (error) {
        this.logger.warn(
          "Failed to retrieve detailed connection info, skipping."
        );
        connectionDetails = { error: "Connection details unavailable" } as any; // Use 'any' type as a fallback for error message
      }

      // Return the full health check details
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
      // Return error status and undefined details
      return {
        status: false,
        details: {
          poolStats: undefined,
          connectionStats: undefined,
          connectionDetails: undefined,
        },
        error: error.message,
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
