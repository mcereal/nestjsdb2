import { Db2ConnectionState } from "../enums";
import {
  Db2ClientState,
  IDb2ConfigOptions,
  IConnectionManager,
  IPoolManager,
  Db2LdapAuthOptions,
  Db2JwtAuthOptions,
  Db2KerberosAuthOptions,
} from "../interfaces";
import { Connection } from "ibm_db";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class Db2ConnectionManager implements IConnectionManager {
  protected readonly logger = new Logger(Db2ConnectionManager.name);

  private state: Db2ClientState = {
    connectionState: Db2ConnectionState.DISCONNECTED,
    activeConnections: 0,
    totalConnections: 0,
    reconnectionAttempts: 0,
    recentErrors: [],
    lastUsed: new Date().toISOString(),
    poolInitialized: false,
  };

  private activeConnections: Connection[] = [];

  constructor(private poolManager: IPoolManager) {
    if (this.poolManager.isPoolInitialized) {
      this.state.poolInitialized = true;
    }
  }

  /**
   * Initialize the connection pool.
   */
  public async init(): Promise<void> {
    this.logger.log("Initializing Db2ConnectionManager...");

    if (this.poolManager.isPoolInitialized) {
      this.state.poolInitialized = true;
      this.state.connectionState = Db2ConnectionState.CONNECTED;
      this.logger.log(
        "Connection Manager initialized successfully. Connection pool is ready."
      );
    } else {
      this.logger.error("DB2 connection pool is not initialized.");
      throw new Error("DB2 connection pool is not initialized.");
    }
  }

  /**
   * Set the current state of the DB2 connection.
   */
  public setState(newState: Partial<Db2ClientState>): void {
    this.state = { ...this.state, ...newState };
    this.logger.log(
      `Connection state updated to: ${this.state.connectionState}`
    );
  }

  /**
   * Get the current state of the DB2 connection.
   */
  public getState(): Db2ClientState {
    return this.state;
  }

  /**
   * Acquire a connection from the pool.
   */

  public async getConnection(): Promise<Connection> {
    if (!this.poolManager.getPool) {
      this.logger.error("Connection pool is not initialized.");
      throw new Error("Connection pool is not initialized.");
    }

    if (this.state.connectionState !== Db2ConnectionState.CONNECTED) {
      this.logger.error("Cannot get a connection. The pool is not connected.");
      throw new Error("Connection pool is not connected.");
    }

    try {
      this.logger.log(
        "Db2ConnectionManager: Acquiring connection from pool..."
      );
      const connection = await this.poolManager.getConnection();
      this.activeConnections.push(connection);
      this.setState({ activeConnections: this.activeConnections.length });
      this.logger.log(
        "Db2ConnectionManager: Connection acquired successfully."
      );
      return connection;
    } catch (error: any) {
      this.logger.error(
        "Db2ConnectionManager: Failed to acquire connection from pool:",
        error.message
      );
      this.setState({
        recentErrors: [...this.state.recentErrors, error.message],
      });
      throw new Error(
        "Failed to acquire connection from pool: " + error.message
      );
    }
  }

  /**
   * Get a connection from the pool based on the provided connection string.
   */
  public async getConnectionFromPool(
    connectionString: string
  ): Promise<Connection> {
    this.logger.log(
      `Fetching connection from pool with connection string: ${connectionString}`
    );

    // Ensure the pool manager is initialized and the pool is ready
    if (!this.poolManager.getPool) {
      this.logger.error("Connection pool is not initialized.");
      throw new Error("Connection pool is not initialized.");
    }

    // Check if the connection state is CONNECTED
    if (this.state.connectionState !== Db2ConnectionState.CONNECTED) {
      this.logger.error("Cannot get a connection. The pool is not connected.");
      throw new Error("Connection pool is not connected.");
    }

    try {
      // Fetch connection from the pool
      this.setState({ connectionState: Db2ConnectionState.INITIALIZING });
      const connection = await this.poolManager.getConnection();
      this.logger.log("Connection acquired successfully.");
      this.activeConnections.push(connection); // Track the active connection
      this.setState({
        connectionState: Db2ConnectionState.CONNECTED,
        activeConnections: this.activeConnections.length,
      });
      return connection;
    } catch (error: any) {
      this.logger.error("Failed to get connection from pool", error.message);
      this.setState({
        recentErrors: [...this.state.recentErrors, error.message],
      });
      throw new Error("Failed to get connection from pool: " + error.message);
    }
  }

  /**
   * Close the connection and remove it from the active connections list.
   */
  public async closeConnection(connection: Connection): Promise<void> {
    if (connection) {
      try {
        this.logger.log("Closing DB2 connection...");
        this.setState({ connectionState: Db2ConnectionState.DISCONNECTING });
        await this.poolManager.closeConnection(connection);
        const index = this.activeConnections.indexOf(connection);
        if (index > -1) {
          this.activeConnections.splice(index, 1);
          this.setState({ activeConnections: this.activeConnections.length });
        }
        this.setState({ connectionState: Db2ConnectionState.DISCONNECTED });
        this.logger.log(
          "Connection closed and removed from active connections."
        );
      } catch (error: any) {
        this.logger.error("Error closing DB2 connection", error.message);
        this.setState({
          recentErrors: [...this.state.recentErrors, error.message],
        });
        throw error;
      }
    }
  }

  /**
   * Disconnects from the DB2 pool by draining the pool manager.
   * Sets the connection state to DISCONNECTED upon successful disconnection.
   * Handles and logs any errors that occur during the disconnection process.
   */
  public async disconnect(): Promise<void> {
    if (this.state.connectionState === Db2ConnectionState.DISCONNECTED) {
      this.logger.warn("Already disconnected from DB2.");
      return;
    }

    try {
      this.logger.log("Attempting to disconnect from DB2...");
      await this.poolManager.drainPool(); // Drains the connection pool
      this.setState({ connectionState: Db2ConnectionState.DISCONNECTED });
      this.logger.log("Successfully disconnected from DB2.");
    } catch (error: any) {
      this.logger.error("Failed to disconnect from DB2:", error.message);
      this.setState({
        recentErrors: [...this.state.recentErrors, error.message],
      });
      throw error; // Rethrow to allow upstream handling
    }
  }

  /**
   * Drain the connection pool and release all resources.
   */
  public async drainPool(): Promise<void> {
    if (this.state.connectionState === Db2ConnectionState.DISCONNECTED) {
      this.logger.warn("Pool is already disconnected.");
      return;
    }

    this.logger.log("Draining DB2 connection pool...");
    this.setState({ connectionState: Db2ConnectionState.DISCONNECTING });

    try {
      await this.poolManager.drainPool();
      this.setState({
        connectionState: Db2ConnectionState.DISCONNECTED,
        activeConnections: 0,
      });
      this.logger.log("DB2 connection pool drained successfully.");
    } catch (error: any) {
      this.logger.error("Error draining DB2 connection pool", error.message);
      this.state.recentErrors.push(error.message);
      if (this.state.recentErrors.length > 10) {
        this.state.recentErrors.shift();
      }
      throw error;
    }
  }

  /**
   * Get the number of active connections.
   */
  public getActiveConnectionsCount(): number {
    const activeConnections = this.activeConnections.length;
    this.logger.log(`Active connections: ${activeConnections}`);
    return activeConnections;
  }

  /**
   * Log the current pool status, including active connections.
   */
  public logPoolStatus(): void {
    const activeConnections = this.getActiveConnectionsCount();
    this.logger.log(
      `Connection Pool Status: Active=${activeConnections}, State=${
        Db2ConnectionState[this.state.connectionState]
      }`
    );
  }

  /**
   * Check the health of the connection pool.
   */
  public async checkHealth(): Promise<{ status: boolean; details?: any }> {
    this.logger.log("Checking DB2 connection pool health...");
    const activeConnections = this.getActiveConnectionsCount();
    return { status: activeConnections > 0, details: { activeConnections } };
  }
}
