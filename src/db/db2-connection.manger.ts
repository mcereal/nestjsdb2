import { Db2ConnectionState } from '../enums';
import {
  Db2ClientState,
  IConnectionManager,
  IPoolManager,
} from '../interfaces';
import { Connection } from 'ibm_db';
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { I_POOL_MANAGER } from '../constants/injection-token.constant';
import { Logger } from '../utils';

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

  constructor(
    @Inject(forwardRef(() => I_POOL_MANAGER)) private poolManager: IPoolManager,
  ) {}

  /**
   * Initialize the connection pool.
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
   */
  public getState(): Db2ClientState {
    return {
      ...this.state,
      poolInitialized: this.poolManager.isPoolInitialized,
    };
  }

  /**
   * Acquire a connection from the pool.
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
   */
  public getActiveConnectionsCount(): number {
    const activeConnections = this.activeConnections.length;
    this.logger.info(`Active connections: ${activeConnections}`);
    return activeConnections;
  }

  /**
   * Log the current pool status, including active connections.
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
   */
  public async checkHealth(): Promise<{ status: boolean; details?: any }> {
    this.logger.info('Checking DB2 connection pool health...');
    const activeConnections = this.getActiveConnectionsCount();
    return { status: activeConnections > 0, details: { activeConnections } };
  }
}
