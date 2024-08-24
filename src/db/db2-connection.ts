// src/db/db2.connection.ts

import { Socket } from "net";
import { TLSSocket } from "tls";
import { Db2ConnectionState } from "../enums/db2.enums";
import { Logger } from "@nestjs/common";
import {
  Db2ConfigOptions,
  Db2ConnectionInterface,
} from "src/interfaces/db2.interface";
import { Db2Error } from "../errors/db2.error";
import { SocketManager } from "./socket-manager";
import { TransactionManager } from "./transaction-manager";

export class Db2Connection implements Db2ConnectionInterface {
  private readonly logger = new Logger(Db2Connection.name);
  private state: Db2ConnectionState = Db2ConnectionState.DISCONNECTED;
  private activeConnections: number = 0;
  private connectionPool: Array<Socket | TLSSocket> = [];
  private options: Db2ConfigOptions;
  private socketManager: SocketManager;
  private transactionManager: TransactionManager;

  private lastUsedTime: number;
  private creationTime: number;
  private totalConnections: number = 0;
  private failedConnectionAttempts: number;

  constructor(options: Db2ConfigOptions) {
    this.options = this.applyDefaults(options); // Apply sensible defaults
    this.socketManager = new SocketManager(this.options);
    this.transactionManager = new TransactionManager(this);

    this.creationTime = Date.now();
    this.lastUsedTime = Date.now();

    this.validateConfig();
    setInterval(() => this.logConnectionMetrics(), 60000); // Log metrics every 60 seconds
    process.on("SIGINT", () => this.handleShutdown());
    process.on("SIGTERM", () => this.handleShutdown());
    this.startIdleConnectionCleanup(); // Check for idle connections
    this.startConnectionLifetimeCheck(); // Check for max connection lifetime
  }

  /**
   * Apply sensible default values to the configuration options if not provided.
   * @param options The options to which defaults are applied.
   * @returns The options with defaults applied.
   */
  private applyDefaults(options: Db2ConfigOptions): Db2ConfigOptions {
    return {
      connectionTimeout: 30000, // Default to 30 seconds
      idleTimeout: 300000, // Default to 5 minutes
      maxPoolSize: 10, // Default to 10 connections in the pool
      minPoolSize: 1, // Default to at least 1 connection
      queryTimeout: 60000, // Default to 1 minute
      retryPolicy: "simple", // Default to simple retry
      retryAttempts: 3, // Default to 3 retry attempts
      retryInterval: 1000, // Default to 1 second
      maxLifetime: 1800000, // Default to 30 minutes for connection lifetime
      logQueries: false, // Default to not logging queries
      logErrors: true, // Default to logging errors
      traceLevel: "info", // Default trace level
      ...options, // Override with any user-provided options
    };
  }

  async connect(): Promise<void> {
    this.logger.log(
      `Request to connect. Active connections: ${this.activeConnections}`
    );

    const availableConnection = this.connectionPool.find(
      (socket) => socket && !socket.destroyed
    );

    if (availableConnection) {
      if (this.options.logQueries) {
        this.logger.log("Reusing an existing connection from the pool.");
      }
      this.lastUsedTime = Date.now(); // Update last used time
      return;
    }

    if (this.activeConnections >= this.options.maxPoolSize) {
      throw new Db2Error("Maximum connection pool size reached.");
    }

    try {
      const socket = this.socketManager.connect(); // Using SocketManager
      this.connectionPool.push(socket);
      this.activeConnections++;
      this.totalConnections++; // Increment total connections count
      this.state = Db2ConnectionState.CONNECTED;
      this.lastUsedTime = Date.now(); // Update last used time
      if (this.options.logQueries) {
        this.logger.log("Successfully connected to Db2 database.");
      }
    } catch (error) {
      this.failedConnectionAttempts++; // Increment failed connection attempts count
      this.state = Db2ConnectionState.ERROR;
      this.handleError(error, "Connection");
      await this.retryConnection();
    }
  }

  async disconnect(): Promise<void> {
    this.logger.log("Disconnecting all Db2 connections...");
    for (const conn of this.connectionPool) {
      conn.end();
    }
    this.connectionPool = [];
    this.activeConnections = 0;
    this.state = Db2ConnectionState.DISCONNECTED;
    this.logger.log("All Db2 connections have been disconnected.");
  }

  async beginTransaction(): Promise<void> {
    return this.transactionManager.beginTransaction();
  }

  async commitTransaction(): Promise<void> {
    return this.transactionManager.commitTransaction();
  }

  async rollbackTransaction(): Promise<void> {
    return this.transactionManager.rollbackTransaction();
  }

  /**
   * Remove a socket from the connection pool.
   * @param socket The socket to remove.
   */
  private removeSocketFromPool(socket: Socket | TLSSocket): void {
    this.connectionPool = this.connectionPool.filter((conn) => conn !== socket);
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  /**
   * Execute a SQL query against the Db2 database.
   * @param sql The SQL query to send.
   * @param params Optional query parameters.
   * @param timeout Optional timeout for the query.
   * @returns A promise that resolves with the query results.
   * @throws Db2Error if not connected or if an error occurs while sending the command.
   */
  async query<T>(
    sql: string,
    params: any[] = [],
    timeout?: number
  ): Promise<T> {
    if (this.state !== Db2ConnectionState.CONNECTED) {
      throw new Db2Error("Not connected to the database.");
    }

    const queryTimeout = timeout || this.options.queryTimeout;
    const fetchSize = this.options.fetchSize || 100; // Set default fetch size if not provided

    // Conditional logging based on logQueries flag
    if (this.options.logQueries) {
      this.logger.log(
        `Sending query: ${sql} with params: ${params} and fetchSize: ${fetchSize}`
      );
    }

    const socket = this.borrowConnection();

    return new Promise<T>((resolve, reject) => {
      const queryCommand = `${sql} ${params.join(", ")}`;

      socket.write(queryCommand, (err) => {
        if (err) {
          this.handleError(err, "Query");
          this.releaseConnection(socket);
          return reject(new Db2Error("Failed to send query."));
        }
        if (this.options.logQueries) {
          this.logger.log("Query sent successfully.");
        }
      });

      if (queryTimeout) {
        socket.setTimeout(queryTimeout, () => {
          this.logger.warn("Query execution timeout.");
          socket.destroy(); // Destroy the socket on timeout
          this.releaseConnection(socket);
          reject(new Db2Error("Query execution timed out."));
        });
      }

      socket.once("data", (data) => {
        if (this.options.logQueries) {
          this.logger.log(`Received response: ${data.toString()}`);
        }
        this.releaseConnection(socket); // Release the connection back to the pool
        resolve(JSON.parse(data.toString()) as T);
      });

      socket.once("error", (err) => {
        this.handleError(err, "Query");
        this.releaseConnection(socket);
        reject(new Db2Error("Error occurred during query execution."));
      });
    });
  }

  /**
   * Execute a prepared statement against the Db2 database.
   * @param sql The SQL statement to prepare and execute.
   * @param params Optional parameters for the SQL statement.
   * @returns The result of the prepared statement execution.
   * @throws Db2Error if an error occurs during prepared statement execution.
   */
  async executePreparedStatement<T>(
    sql: string,
    params: any[] = []
  ): Promise<T> {
    this.logger.log(
      `Executing prepared statement: ${sql} with params: ${params}`
    );
    return this.query<T>(sql, params);
  }

  /**
   * Borrow a connection from the pool.
   * @returns A socket connection.
   * @throws Db2Error if no connection is available.
   */
  private borrowConnection(): Socket | TLSSocket {
    const availableSocket = this.connectionPool.find(
      (socket) => !socket.destroyed && socket.readyState === "open"
    );

    if (!availableSocket) {
      throw new Db2Error("No available connection in the pool.");
    }

    return availableSocket;
  }

  /**
   * Release a connection back to the pool.
   * @param socket The socket to release.
   */

  private releaseConnection(socket: Socket | TLSSocket): void {
    if (socket && socket.destroyed) {
      this.removeSocketFromPool(socket);
    } else {
      // Mark this connection as idle/available
      this.lastUsedTime = Date.now(); // Update last used time
      if (this.options.idleTimeout) {
        socket.setTimeout(this.options.idleTimeout);
      }
    }
  }
  /**
   * Periodically check for idle connections and close them.
   */
  private startIdleConnectionCleanup(interval: number = 60000): void {
    setInterval(() => {
      const now = Date.now();
      this.connectionPool.forEach((socket) => {
        const idleTime = now - this.lastUsedTime;
        if (
          (socket && socket.readyState !== "open") ||
          idleTime > (this.options.idleTimeout || 300000)
        ) {
          this.logger.log("Closing idle connection.");
          socket.end();
          this.removeSocketFromPool(socket);
        }
      });
    }, interval);
  }

  private startConnectionLifetimeCheck(interval: number = 60000): void {
    setInterval(() => {
      const now = Date.now();
      this.connectionPool.forEach((socket) => {
        const lifetime = now - this.creationTime;
        if (lifetime > (this.options.maxLifetime || 1800000)) {
          // Default 30 minutes
          this.logger.log("Recycling connection due to max lifetime exceeded.");
          socket.end();
          this.removeSocketFromPool(socket);
          this.connect(); // Create a new connection to maintain pool size
        }
      });
    }, interval);
  }

  /**
   * Retry connection attempts with exponential backoff.
   */
  private async retryConnection(attempts: number = 0): Promise<void> {
    const maxRetries = this.options.retryAttempts || 3;

    if (this.options.retryPolicy === "none") {
      throw new Db2Error(
        "Retry policy is set to 'none'. Not retrying connection."
      );
    }

    if (attempts < maxRetries) {
      let retryInterval = this.options.retryInterval || 1000; // Default to 1 second
      if (this.options.retryPolicy === "exponentialBackoff") {
        retryInterval = Math.min(1000 * Math.pow(2, attempts), 30000); // Exponential backoff capped at 30 seconds
      }
      this.logger.warn(`Retrying connection in ${retryInterval}ms...`);
      await new Promise((resolve) => setTimeout(resolve, retryInterval));
      await this.connect(); // Re-attempt to connect
    } else {
      throw new Db2Error("Failed to connect after multiple attempts.");
    }
  }

  /**
   * Log metrics for connection pool usage.
   */
  private logConnectionMetrics(): void {
    const activeCount = this.connectionPool.filter(
      (socket) => !socket.destroyed
    ).length;
    const now = Date.now();
    const avgConnectionTime = this.totalConnections
      ? (now - this.creationTime) / this.totalConnections
      : 0;

    this.logger.log(`Active connections: ${activeCount}`);
    this.logger.log(`Total connections made: ${this.totalConnections}`);
    this.logger.log(
      `Failed connection attempts: ${this.failedConnectionAttempts}`
    );
    this.logger.log(
      `Average connection time (ms): ${avgConnectionTime.toFixed(2)}`
    );

    // Optionally, export metrics to a monitoring system
  }
  /**
   * Begin a transaction with rollback support on error.
   */
  async transactional<T>(operation: () => Promise<T>): Promise<T> {
    await this.beginTransaction();
    try {
      const result = await operation();
      await this.commitTransaction();
      return result;
    } catch (error) {
      await this.rollbackTransaction();
      throw error; // Re-throw to handle elsewhere
    }
  }

  /**
   * Switch to a replica host in case of primary failure.
   */
  private switchToReplica(): void {
    if (
      this.options.readReplicaHosts &&
      this.options.readReplicaHosts.length > 0
    ) {
      this.logger.log("Switching to a replica host.");
      const replicaHost = this.options.readReplicaHosts.shift(); // Rotate through replicas
      this.options.host = replicaHost;
      this.connect(); // Attempt connection to the new host
    } else {
      throw new Db2Error("No replica hosts available for failover.");
    }
  }

  /**
   * Handle graceful shutdown.
   */
  async handleShutdown(): Promise<void> {
    this.logger.log("Graceful shutdown initiated. Closing all connections.");
    await this.disconnect(); // Ensure all connections are closed
    process.exit(0);
  }

  /**
   * Validate Db2 configuration options.
   */
  private validateConfig(): void {
    const errors: string[] = [];

    if (!this.options.host) {
      errors.push("DB2 configuration error: Host must be specified.");
    }
    if (!this.options.port) {
      errors.push("DB2 configuration error: Port must be specified.");
    }
    if (this.options.useTls && !this.options.sslCertificatePath) {
      errors.push(
        "DB2 configuration error: SSL certificate path must be specified when TLS is enabled."
      );
    }
    if (this.options.retryAttempts && this.options.retryAttempts < 0) {
      errors.push(
        "DB2 configuration error: Retry attempts must be a positive number."
      );
    }
    if (
      this.options.connectionTimeout &&
      this.options.connectionTimeout < 1000
    ) {
      errors.push(
        "DB2 configuration error: Connection timeout must be at least 1000ms."
      );
    }
    if (this.options.queryTimeout && this.options.queryTimeout < 1000) {
      errors.push(
        "DB2 configuration error: Query timeout must be at least 1000ms."
      );
    }
    if (this.options.maxPoolSize && this.options.maxPoolSize < 1) {
      errors.push("DB2 configuration error: Max pool size must be at least 1.");
    }
    if (this.options.minPoolSize && this.options.minPoolSize < 0) {
      errors.push("DB2 configuration error: Min pool size cannot be negative.");
    }
    if (this.options.maxLifetime && this.options.maxLifetime < 30000) {
      errors.push(
        "DB2 configuration error: Max lifetime must be at least 30000ms."
      );
    }
    if (this.options.idleTimeout && this.options.idleTimeout < 30000) {
      errors.push(
        "DB2 configuration error: Idle timeout must be at least 30000ms."
      );
    }
    if (errors.length > 0) {
      throw new Error(errors.join("\n"));
    }
  }

  /**
   * Check the health of the connection.
   * @returns True if the connection is healthy, false otherwise.
   */
  async checkHealth(): Promise<boolean> {
    try {
      await this.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Return the number of active connections.
   */
  getActiveConnectionsCount(): number {
    return this.activeConnections;
  }

  /**
   * Drain the connection pool.
   */

  async drainPool(): Promise<void> {
    this.logger.log("Draining the connection pool...");
    for (const conn of this.connectionPool) {
      conn.destroy();
    }
    this.connectionPool = [];
    this.activeConnections = 0;
    this.state = Db2ConnectionState.POOL_DRAINED;
    this.logger.log("Connection pool drained.");
  }

  /**
   * Method to get the current state of the connection.
   * @returns The current state of the Db2 connection.
   */
  getState(): Db2ConnectionState {
    return this.state;
  }

  /**
   * Error handling method for logging and rethrowing errors.
   * @param error The error to handle
   * @param context Context of the error occurrence
   */
  private handleError(error: any, context: string): void {
    const errorMessage = `Error in ${context}: ${error.message}`;
    if (this.options.logErrors) {
      this.logger.error(errorMessage);
    }
    throw new Db2Error(errorMessage);
  }
}
