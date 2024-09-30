import { Pool, Connection } from 'ibm_db';
import {
  Db2AuthOptions,
  IDb2Client,
  IDb2ConfigOptions,
  Db2ConnectionDetails,
  Db2ConnectionStats,
  Db2HealthDetails,
  Db2PoolStats,
  IPoolManager,
} from '../interfaces';
import { Db2ConnectionState } from '../enums';
import {
  Db2ConnectionError,
  Db2Error,
  Db2TransactionError,
  formatDb2Error,
} from '../errors';
import { Db2AuthStrategy } from '../auth/db2-auth.strategy';
import { Db2Config } from './';
import { IConnectionManager } from '../interfaces/connection-mannager.interface';
import { Logger } from '../utils';
import { MigrationService } from '../services/migration.service';
import { MetadataManager } from '../orm/metadata';

export class Db2Client implements IDb2Client {
  protected readonly config: IDb2ConfigOptions;
  protected readonly authConfig: Db2AuthOptions;
  protected readonly authStrategy: Db2AuthStrategy;
  readonly logger = new Logger(Db2Client.name);
  private pool: Pool;
  protected connection?: Connection;
  private idleTimeoutInterval: NodeJS.Timeout;
  private activeConnectionsList: Connection[] = [];
  private totalConnections = 0;
  private reconnectionAttempts = 0;
  private recentErrors: string[] = [];
  protected lastUsed: number = Date.now();
  protected poolInitialized = false;
  private currentReconnectAttempts = 0;
  private idleConnections = 0;
  private migrationService: MigrationService;
  private metadataManager: MetadataManager;

  public constructor(
    config: Db2Config,
    private readonly connectionManager: IConnectionManager,
    private readonly poolManager: IPoolManager,
  ) {
    this.config = config.config;

    // Initialize MigrationService within Db2Client
    this.migrationService = new MigrationService();

    // Initialize MetadataManager
    this.metadataManager = new MetadataManager();
  }

  public async init(): Promise<void> {
    try {
      while (!this.poolManager.isPoolInitialized) {
        this.logger.info(
          'Waiting for the connection pool to be initialized...',
        );
        await new Promise((resolve) => setTimeout(resolve, 100)); // Wait 100ms
      }

      this.connectionManager.setState({
        poolInitialized: true,
        connectionState: Db2ConnectionState.CONNECTED,
      });
      this.logger.info('Db2 client initialized successfully.');

      this.startIdleTimeoutCheck(); // Start idle timeout checks after initialization
    } catch (error) {
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.ERROR,
      });
      this.logger.error('Error during Db2 client initialization:', error);
      throw error; // Re-throw to propagate the error
    }
  }

  /**
   * Destroy the Db2Client. Should be called manually before shutting down the application.
   */
  public async destroy(): Promise<void> {
    await this.drainPool();
    this.connectionManager.setState({
      connectionState: Db2ConnectionState.DISCONNECTED,
    });
    this.logger.info('Db2 client disconnected and destroyed');
  }

  public async drainPool(): Promise<void> {
    this.connectionManager.setState({
      connectionState: Db2ConnectionState.POOL_DRAINING,
    });
    this.logger.info('Draining the connection pool...');

    try {
      this.stopIdleTimeoutCheck();
      await this.poolManager.drainPool(); // Use PoolManager to drain the pool
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.POOL_DRAINED,
      });
      this.logger.info('Connection pool drained successfully.');
    } catch (error: any) {
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.ERROR,
      });
      this.logger.error('Error during shutdown:', error.message);
    }
  }

  public async getConnection(): Promise<Connection> {
    // Ensure that the pool is initialized before getting a connection
    while (!this.poolManager.isPoolInitialized) {
      this.logger.info('Waiting for the connection pool to be initialized...');
      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait 100ms
    }

    try {
      const connection = await this.poolManager.getConnection();
      this.activeConnectionsList.push(connection);
      this.totalConnections++;
      this.connectionManager.setState({
        activeConnections: this.activeConnectionsList.length,
      });
      return connection;
    } catch (error: any) {
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.ERROR,
      });
      this.logger.error('Failed to get connection:', error.message);
      throw new Db2ConnectionError('Failed to get connection');
    }
  }

  public async closePool(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.logger.info('Closing DB2 connection pool...');
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.DISCONNECTING,
      });

      this.pool.close((err) => {
        if (err) {
          this.connectionManager.setState({
            connectionState: Db2ConnectionState.ERROR,
          });
          this.logger.error('Error closing DB2 connection pool', err);
          reject(new Db2ConnectionError('Failed to close DB2 connection pool'));
        } else {
          this.connectionManager.setState({
            connectionState: Db2ConnectionState.POOL_DRAINED,
          });
          this.logger.info('DB2 connection pool closed successfully');
          resolve();
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
      this.logger.error('Maximum reconnect attempts reached.');
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.ERROR,
      });
      throw new Db2ConnectionError('All reconnection attempts failed.');
    }

    await this.sleep(this.config.retry?.reconnectInterval || 5000);
    await this.getConnection();
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
    this.logger.info('Started idle timeout checks.');
  }

  private stopIdleTimeoutCheck() {
    if (this.idleTimeoutInterval) {
      clearInterval(this.idleTimeoutInterval);
      this.logger.info('Stopped idle timeout checks.');
    }
  }

  private async checkIdleTimeout(): Promise<void> {
    const { idleTimeout } = this.config;
    const now = Date.now();

    if (this.connection && now - this.lastUsed > idleTimeout) {
      this.logger.warn(
        `Idle timeout reached (${idleTimeout} ms), closing connection...`,
      );

      try {
        await this.disconnect();
        this.logger.info('Connection closed due to idle timeout.');

        this.logger.info('Attempting to reconnect after idle timeout...');
        await this.reconnect();
        this.logger.info('Reconnection successful after idle timeout.');
      } catch (error) {
        const errorMessage = formatDb2Error(error, 'Idle Timeout Check', {
          host: this.config.host,
          database: this.config.database,
          idleTimeout,
        });
        this.logger.error(
          `Failed to handle idle timeout properly: ${errorMessage}`,
        );
        throw new Db2Error(
          'Failed to handle idle timeout. Check logs for details.',
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
        this.logger.info('Disconnecting from DB2 database...');
        await this.poolManager.releaseConnection(this.connection);

        // Ensure the connection is properly set to null
        this.connection = null;
        this.connectionManager.setState({
          connectionState: Db2ConnectionState.DISCONNECTED,
        });

        this.logger.info('Db2 database connection closed and reset to null.');

        // Stop the idle timeout and lifetime checks after disconnection
        this.stopIdleTimeoutCheck();
      } catch (error) {
        this.connectionManager.setState({
          connectionState: Db2ConnectionState.ERROR,
        });
        this.logError('Error disconnecting from Db2 database', error);
        throw new Db2ConnectionError('Failed to disconnect from Db2 database');
      }
    } else {
      this.logger.warn('No active connection to disconnect.');
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
      this.connectionManager.setState({
        activeConnections: this.activeConnectionsList.length,
      });
    }
    this.logger.info('Connection released back to the pool.');
  }

  /**
   * Reconnect logic for the Db2 client.
   * Attempts to re-establish a connection using the existing configuration.
   */
  private async reconnect(): Promise<void> {
    if (
      this.connectionManager.getState().connectionState !==
        Db2ConnectionState.CONNECTED &&
      this.connectionManager.getState().connectionState !==
        Db2ConnectionState.RECONNECTING
    ) {
      try {
        this.logger.info('Attempting to reconnect to DB2...');
        this.connectionManager.setState({
          connectionState: Db2ConnectionState.RECONNECTING,
        });
        this.reconnectionAttempts += 1;
        const connection = await this.getConnection();
        await this.closeConnection(connection);
        this.logger.info('Reconnection successful');
        this.connectionManager.setState({
          connectionState: Db2ConnectionState.CONNECTED,
        });
      } catch (error) {
        this.logger.error('Reconnection failed:', error);
        this.recentErrors.push(error.message);
        await this.handleConnectionError(error); // Handle the error and retry
        this.connectionManager.setState({
          connectionState: Db2ConnectionState.ERROR,
        });
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
    sql: string,
    params: Record<string, any> = [],
    timeout?: number,
  ): Promise<T> {
    const connection = await this.getConnection();
    try {
      this.logger.info(`Executing query: ${sql}`);

      return new Promise<T>((resolve, reject) => {
        // Apply a query timeout if provided
        const queryTimeout = setTimeout(() => {
          reject(new Db2ConnectionError('Query execution timed out'));
        }, timeout || this.config.queryTimeout);

        connection.query(sql, params, (err: Error, result: T) => {
          clearTimeout(queryTimeout); // Clear the timeout once the query resolves
          if (err) {
            this.logger.error('Error executing query', err.message);
            reject(new Db2ConnectionError('Failed to execute query'));
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
    valuesArray: any[][],
  ): Promise<void> {
    this.logger.info(`Starting batch insert into table: ${tableName}`);

    const columnsString = columns.join(', ');
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${tableName} (${columnsString}) VALUES (${placeholders})`;

    const stmt = this.connection.prepareSync(sql);
    for (const values of valuesArray) {
      stmt.executeSync(values);
    }
    stmt.closeSync();
    this.logger.info(`Batch insert completed for table: ${tableName}`);
  }

  /**
   * Executes a prepared statement on the Db2 database.
   * @param sql The SQL query string to execute.
   * @param params An array of parameters to bind to the query.
   * @returns A promise that resolves with the result of the query.
   */
  public async executePreparedStatement<T>(
    sql: string,
    params: any[] = [],
  ): Promise<T> {
    this.logger.info(`Executing prepared statement: ${sql}`);
    if (!this.connection) {
      this.logger.warn(
        'No active connection to execute the prepared statement. Attempting to reconnect...',
      );
      await this.reconnect();
    }

    return new Promise<T>((resolve, reject) => {
      this.connection.prepare(sql, (err, stmt) => {
        if (err) {
          this.logger.error('Error preparing statement:', err.message);
          reject(new Db2Error('Failed to prepare statement'));
          return;
        }

        stmt.execute(params, (error, result) => {
          if (error) {
            this.logger.error(
              'Error executing prepared statement:',
              error.message,
            );
            reject(new Db2Error('Prepared statement execution failed'));
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
    callback: () => Promise<void>,
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
    if (
      this.connectionManager.getState().connectionState !==
      Db2ConnectionState.CONNECTED
    ) {
      throw new Db2Error('Cannot begin transaction. No active connection.');
    }
    await this.query('BEGIN');
    this.logger.info('Transaction started successfully.');
  }

  /**
   * Commits the current transaction.
   */
  public async commitTransaction(): Promise<void> {
    if (
      this.connectionManager.getState().connectionState !==
      Db2ConnectionState.CONNECTED
    ) {
      throw new Db2Error('Cannot commit transaction. No active connection.');
    }
    await this.query('COMMIT');
    this.logger.info('Transaction committed successfully.');
  }

  /**
   * Rolls back the current transaction.
   */
  public async rollbackTransaction(): Promise<void> {
    if (
      this.connectionManager.getState().connectionState !==
      Db2ConnectionState.CONNECTED
    ) {
      throw new Db2Error('Cannot rollback transaction. No active connection.');
    }
    await this.query('ROLLBACK');
    this.logger.info('Transaction rolled back successfully.');
  }

  public async batchUpdate(
    tableName: string,
    columns: string[],
    valuesArray: any[][],
    whereClause: string,
  ): Promise<void> {
    this.logger.info(`Starting batch update on table: ${tableName}`);

    if (!this.connection) {
      this.logger.warn(
        'No active connection to perform batch update. Attempting to reconnect...',
      );
      await this.reconnect(); // Attempt to reconnect before batch update
    }

    const setString = columns.map((col) => `${col} = ?`).join(', ');
    const sql = `UPDATE ${tableName} SET ${setString} WHERE ${whereClause}`;

    try {
      const stmt = this.connection.prepareSync(sql); // Prepare the statement

      for (const values of valuesArray) {
        stmt.executeSync(values); // Execute each row update
      }

      stmt.closeSync(); // Close the statement after execution
      this.logger.info(`Batch update completed for table: ${tableName}`);
    } catch (error) {
      this.logError('Batch update error', error);
      throw new Db2TransactionError('Batch update failed');
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
      this.logger.info(`Active connections: ${activeConnections}`);
      return activeConnections;
    } catch (error) {
      this.logger.error(
        'Failed to get active connections count:',
        error.message,
      );
    }
  }

  /**
   * Logs the current pool status, including active and idle connections.
   */
  public logPoolStatus(): void {
    const activeConnections = this.getActiveConnectionsCount();
    const idleConnections = this.idleConnections;

    this.logger.info(
      `Connection Pool Status: Active=${activeConnections}, Idle=${idleConnections}`,
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
    this.logger.info('Performing extended health check...');

    try {
      // Execute a test query to verify base health check
      await this.query('SELECT 1 FROM SYSIBM.SYSDUMMY1');
      this.logger.info('DB2 base health check passed');

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
          'Failed to retrieve detailed connection info, skipping.',
        );
        connectionDetails = { error: 'Connection details unavailable' } as any; // Use 'any' type as a fallback for error message
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
      this.logger.error('DB2 health check failed:', error);
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
      this.logger.error('Failed to get DB connection stats:', error);
      throw new Db2Error('Failed to get DB connection stats');
    }
  }

  /**
   * Get DB2 connection details from the system catalog
   */
  public async getDbConnectionDetails(): Promise<any> {
    this.logger.info('Getting DB connection details...');

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
      this.logger.info('Executing query: ' + query);
      const connection = await this.getConnection();
      const result = await connection.query(query);
      this.logger.info('DB2 connection details retrieved successfully');
      return result;
    } catch (error) {
      this.logger.error('Failed to get DB connection details:', error);
      throw new Db2Error('Failed to get DB connection details');
    }
  }

  /**
   * Runs the migration scripts provided by the MigrationService.
   */
  private async runMigrations(): Promise<void> {
    const entities = this.metadataManager.getAllEntities();

    for (const entity of entities) {
      let tableMetadata;
      try {
        tableMetadata =
          this.metadataManager.getEntityMetadata(entity).tableMetadata;
      } catch (error) {
        this.logger.warn(
          `No table metadata found for entity ${entity.name}. Skipping.`,
        );
        continue;
      }

      // Extract column details and options
      const columns = tableMetadata.columns.reduce(
        (acc, column) => {
          acc[column.propertyKey] = column.type;
          return acc;
        },
        {} as Record<string, string>,
      );

      const options = {
        primaryKeys: tableMetadata.primaryKeys
          .map((pk) => pk.propertyKey)
          .join(','),
        // Add other options as needed
      };

      const createTableSQL = this.migrationService.generateCreateTableSQL(
        tableMetadata.tableName,
        columns,
        options,
      );

      // Execute the generated SQL
      await this.query(createTableSQL);
    }
  }
}
