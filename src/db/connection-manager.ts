import { Db2ConnectionState } from '../enums';
import {
  Db2ClientState,
  IConnectionManager,
  IPoolManager,
} from '../interfaces';
import { Connection } from './Connection';
import { Logger } from '../utils';

/**
 * ConnectionManager class to manage the DB2 connection.
 * This class is responsible for initializing the connection pool, acquiring and releasing connections.
 * It also provides methods to close the connection pool and release all resources.
 * @implements IConnectionManager
 * @class
 * @public
 * @property {Db2ClientState} state - The current state of the DB2 connection.
 * @property {Connection[]} activeConnections - List of active connections.
 * @property {Logger} logger - Logger instance.
 * @method {init} - Initialize the connection pool.
 * @method {setState} - Set the current state of the DB2 connection.
 * @method {getState} - Get the current state of the DB2 connection.
 * @method {getConnection} - Acquire a connection from the pool.
 * @method {getConnectionFromPool} - Get a connection from the pool based on the provided connection string.
 * @method {closeConnection} - Close the connection and remove it from the active connections list.
 * @method {disconnect} - Disconnect from the DB2 pool by draining the pool manager.
 * @method {drainPool} - Drain the connection pool and release all resources.
 * @method {getActiveConnectionsCount} - Get the number of active connections.
 * @method {logPoolStatus} - Log the current pool status, including active connections.
 * @method {checkHealth} - Check the health of the connection pool.
 * @constructor
 * @param {IPoolManager} poolManager - Pool manager instance.
 * @returns {ConnectionManager} - ConnectionManager instance.
 * @example
 * ```typescript
 * const poolManager = new PoolManager(config, authStrategy);
 * const connectionManager = new ConnectionManager(poolManager);
 * connectionManager.init();
 * ```
 */
export class ConnectionManager implements IConnectionManager {
  protected readonly logger = new Logger(ConnectionManager.name);

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

  constructor(private poolManager: IPoolManager) {}

  /**
   * Initialize the connection pool.
   * Sets the connection state to INITIALIZING upon initialization.
   * Handles and logs any errors that occur during the initialization process.
   * @returns {Promise<void>} - A Promise that resolves if the connection pool is initialized successfully.
   * @public
   * @async
   * @method
   * @throws {Error} - If the connection pool is not initialized.
   * @example
   * ```typescript
   * await connectionManager.init();
   * ```
   */
  public async init(): Promise<void> {
    this.logger.info('Initializing Db2ConnectionManager...');
    this.setState({ connectionState: Db2ConnectionState.INITIALIZING });

    if (this.poolManager.isPoolInitialized) {
      this.setState({
        connectionState: Db2ConnectionState.CONNECTED,
        poolInitialized: true,
      });
      this.logger.info(
        'Connection Manager initialized successfully. Connection pool is ready.',
      );
    } else {
      this.logger.error('DB2 connection pool is not initialized.');
      this.setState({ connectionState: Db2ConnectionState.ERROR });
      throw new Error('DB2 connection pool is not initialized.');
    }
  }

  /**
   * Set the current state of the DB2 connection.
   * @returns {void}
   * @param {Partial<Db2ClientState>} newState - The new state of the DB2 connection.
   * @throws {Error} - If the state transition is invalid.
   * @public
   * @method
   * @example
   * ```typescript
   * connectionManager.setState({ connectionState: Db2ConnectionState.CONNECTED });
   * ```
   */
  public setState(newState: Partial<Db2ClientState>): void {
    const currentState = this.state.connectionState;
    const newConnectionState = newState.connectionState;

    if (newConnectionState && currentState !== newConnectionState) {
      if (this.isValidStateTransition(currentState, newConnectionState)) {
        this.state = { ...this.state, ...newState };
        this.logger.info(
          `Connection state updated from ${currentState} to ${newConnectionState}`,
        );
      } else {
        this.logger.warn(
          `Invalid state transition from ${currentState} to ${newConnectionState}`,
        );
      }
    } else {
      this.state = { ...this.state, ...newState };
    }
  }

  /**
   * Check if the state transition is valid.
   * @returns {boolean} - A boolean indicating if the state transition is valid.
   * @param {Db2ConnectionState} currentState - The current state of the DB2 connection.
   * @param {Db2ConnectionState} newState - The new state of the DB2 connection.
   * @private
   * @method
   */
  private isValidStateTransition(
    currentState: Db2ConnectionState,
    newState?: Db2ConnectionState,
  ): boolean {
    const validTransitions = {
      [Db2ConnectionState.DISCONNECTED]: [
        Db2ConnectionState.INITIALIZING,
        Db2ConnectionState.CONNECTING,
        Db2ConnectionState.AUTHENTICATING,
        Db2ConnectionState.ERROR,
      ],
      [Db2ConnectionState.INITIALIZING]: [
        Db2ConnectionState.CONNECTING,
        Db2ConnectionState.AUTHENTICATING,
        Db2ConnectionState.ERROR,
      ],
      [Db2ConnectionState.CONNECTING]: [
        Db2ConnectionState.AUTHENTICATING,
        Db2ConnectionState.CONNECTED,
        Db2ConnectionState.ERROR,
      ],
      [Db2ConnectionState.AUTHENTICATING]: [
        Db2ConnectionState.CONNECTED,
        Db2ConnectionState.AUTH_FAILED,
        Db2ConnectionState.ERROR,
      ],
      [Db2ConnectionState.CONNECTED]: [
        Db2ConnectionState.DISCONNECTING,
        Db2ConnectionState.ERROR,
      ],
      [Db2ConnectionState.DISCONNECTING]: [Db2ConnectionState.DISCONNECTED],
      [Db2ConnectionState.ERROR]: [
        Db2ConnectionState.RECONNECTING,
        Db2ConnectionState.DISCONNECTED,
      ],
    };
    return newState && validTransitions[currentState]?.includes(newState);
  }

  /**
   * Get the current state of the DB2 connection.
   * @returns {Db2ClientState} - The current state of the DB2 connection.
   * @public
   * @method
   * @example
   * ```typescript
   * const state = connectionManager.getState();
   * ```
   */
  public getState(): Db2ClientState {
    return {
      ...this.state,
      poolInitialized: this.poolManager.isPoolInitialized,
    };
  }

  /**
   * Acquire a connection from the pool.
   * Sets the connection state to CONNECTING upon acquiring a connection.
   * Handles and logs any errors that occur during the connection acquisition process.
   * @returns {Promise<Connection>} - A Promise that resolves with the acquired connection.
   * @public
   * @async
   * @method
   * @throws {Error} - If the connection pool is not initialized or an error occurs during connection acquisition.
   * @example
   * ```typescript
   * const connection = await connectionManager.getConnection();
   * ```
   */

  public async getConnection(): Promise<Connection> {
    if (!this.poolManager.isPoolInitialized) {
      this.logger.error('Connection pool is not initialized.');
      throw new Error('Connection pool is not initialized.');
    }

    if (
      this.state.connectionState !== Db2ConnectionState.CONNECTED &&
      this.state.connectionState !== Db2ConnectionState.AUTHENTICATING
    ) {
      this.setState({ connectionState: Db2ConnectionState.CONNECTING });
    }

    try {
      this.logger.info('Acquiring connection from pool...');
      const connection = await this.poolManager.getConnection();
      this.activeConnections.push(connection);
      this.setState({
        activeConnections: this.activeConnections.length,
        lastUsed: new Date().toISOString(),
      });
      this.logger.info('Connection acquired successfully.');
      return connection;
    } catch (error: any) {
      this.logger.error('Failed to acquire connection:', error.message);
      this.setState({ connectionState: Db2ConnectionState.ERROR });
      throw new Error('Failed to acquire connection: ' + error.message);
    }
  }

  /**
   * Get a connection from the pool based on the provided connection string.
   * @returns {Promise<Connection>} - A Promise that resolves with the acquired connection.
   * @param {string} connectionString - The connection string to use for acquiring a connection.
   * @public
   * @async
   * @method
   * @throws {Error} - If the connection pool is not initialized or an error occurs during connection acquisition.
   * @example
   * ```typescript
   * const connection = await connectionManager.getConnectionFromPool(connectionString);
   * ```
   */
  public async getConnectionFromPool(
    connectionString: string,
  ): Promise<Connection> {
    this.logger.info(
      `Fetching connection from pool with connection string: ${connectionString}`,
    );

    // Ensure the pool manager is initialized and the pool is ready
    if (!this.poolManager.getPool) {
      this.logger.error('Connection pool is not initialized.');
      throw new Error('Connection pool is not initialized.');
    }

    // Check if the connection state is CONNECTED
    if (this.state.connectionState !== Db2ConnectionState.CONNECTED) {
      this.logger.error('Cannot get a connection. The pool is not connected.');
      throw new Error('Connection pool is not connected.');
    }

    try {
      // Fetch connection from the pool
      this.setState({ connectionState: Db2ConnectionState.INITIALIZING });
      const connection = await this.poolManager.getConnection();
      this.logger.info('Connection acquired successfully.');
      this.activeConnections.push(connection); // Track the active connection
      this.setState({
        connectionState: Db2ConnectionState.CONNECTED,
        activeConnections: this.activeConnections.length,
      });
      return connection;
    } catch (error: any) {
      this.logger.error('Failed to get connection from pool', error.message);
      this.setState({
        recentErrors: [...this.state.recentErrors, error.message],
      });
      throw new Error('Failed to get connection from pool: ' + error.message);
    }
  }

  /**
   * Close the connection and remove it from the active connections list.
   * Sets the connection state to DISCONNECTED upon successful disconnection.
   * Handles and logs any errors that occur during the disconnection process.
   * @returns {Promise<void>} - A Promise that resolves when the connection is closed and removed from the active connections list.
   * @param {Connection} connection - The connection to close.
   * @public
   * @async
   * @method
   * @throws {Error} - If the connection is not valid or an error occurs during the disconnection process.
   * @example
   * ```typescript
   * await connectionManager.closeConnection(connection);
   * ```
   */
  public async closeConnection(connection: Connection): Promise<void> {
    if (connection) {
      try {
        this.logger.info('Closing DB2 connection...');
        this.setState({ connectionState: Db2ConnectionState.DISCONNECTING });
        await this.poolManager.closeConnection(connection);
        const index = this.activeConnections.indexOf(connection);
        if (index > -1) {
          this.activeConnections.splice(index, 1);
          this.setState({ activeConnections: this.activeConnections.length });
        }
        if (this.activeConnections.length === 0) {
          this.setState({ connectionState: Db2ConnectionState.DISCONNECTED });
        } else {
          this.setState({ connectionState: Db2ConnectionState.CONNECTED });
        }
        this.logger.info(
          'Connection closed and removed from active connections.',
        );
      } catch (error: any) {
        this.logger.error('Error closing DB2 connection', error.message);
        this.setState({ connectionState: Db2ConnectionState.ERROR });
        throw error;
      }
    }
  }

  /**
   * Disconnects from the DB2 pool by draining the pool manager.
   * Sets the connection state to DISCONNECTED upon successful disconnection.
   * Handles and logs any errors that occur during the disconnection process.
   * @returns {Promise<void>} - A Promise that resolves when the connection is disconnected.
   * @public
   * @async
   * @method
   * @throws {Error} - If an error occurs during the disconnection process.
   * @example
   * ```typescript
   * await connectionManager.disconnect();
   * ```
   */
  public async disconnect(): Promise<void> {
    if (this.state.connectionState === Db2ConnectionState.DISCONNECTED) {
      this.logger.warn('Already disconnected from DB2.');
      return;
    }

    try {
      this.logger.info('Attempting to disconnect from DB2...');
      this.setState({ connectionState: Db2ConnectionState.DISCONNECTING });
      await this.poolManager.drainPool(); // Drains the connection pool
      this.setState({ connectionState: Db2ConnectionState.DISCONNECTED });
      this.logger.info('Successfully disconnected from DB2.');
    } catch (error: any) {
      this.logger.error('Failed to disconnect from DB2:', error.message);
      this.setState({ connectionState: Db2ConnectionState.ERROR });
      throw error; // Rethrow to allow upstream handling
    }
  }

  /**
   * Drain the connection pool and release all resources.
   * Sets the connection state to DISCONNECTED upon successful draining.
   * Handles and logs any errors that occur during the draining process.
   * @returns {Promise<void>} - A Promise that resolves when the connection pool is drained.
   * @public
   * @async
   * @method
   * @throws {Error} - If an error occurs during the draining process.
   * @example
   * ```typescript
   * await connectionManager.drainPool();
   * ```
   */
  public async drainPool(): Promise<void> {
    if (this.state.connectionState === Db2ConnectionState.DISCONNECTED) {
      this.logger.warn('Pool is already disconnected.');
      return;
    }

    this.logger.info('Draining DB2 connection pool...');
    this.setState({ connectionState: Db2ConnectionState.DISCONNECTING });

    try {
      await this.poolManager.drainPool();
      this.setState({
        connectionState: Db2ConnectionState.DISCONNECTED,
        activeConnections: 0,
      });
      this.logger.info('DB2 connection pool drained successfully.');
    } catch (error: any) {
      this.logger.error('Error draining DB2 connection pool', error.message);
      this.setState({ connectionState: Db2ConnectionState.ERROR });
      throw error;
    }
  }

  /**
   * Get the number of active connections.
   * @returns {number} - The number of active connections.
   * @public
   * @method
   * @example
   * ```typescript
   * const activeConnections = connectionManager.getActiveConnectionsCount();
   * ```
   */
  public getActiveConnectionsCount(): number {
    const activeConnections = this.activeConnections.length;
    this.logger.info(`Active connections: ${activeConnections}`);
    return activeConnections;
  }

  /**
   * Log the current pool status, including active connections.
   * @returns {void}
   * @public
   * @method
   * @example
   * ```typescript
   * connectionManager.logPoolStatus();
   * ```
   */
  public logPoolStatus(): void {
    const activeConnections = this.getActiveConnectionsCount();
    this.logger.info(
      `Connection Pool Status: Active=${activeConnections}, State=${
        Db2ConnectionState[this.state.connectionState]
      }`,
    );
  }

  /**
   * Check the health of the connection pool.
   * @returns {Promise<{ status: boolean; details?: any }>} - A Promise that resolves with the health status of the connection pool.
   * @public
   * @async
   * @method
   * @example
   * ```typescript
   * const health = await connectionManager.checkHealth();
   * ```
   */
  public async checkHealth(): Promise<{ status: boolean; details?: any }> {
    this.logger.info('Checking DB2 connection pool health...');
    const activeConnections = this.getActiveConnectionsCount();
    return { status: activeConnections > 0, details: { activeConnections } };
  }
}
