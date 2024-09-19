import { Db2ConnectionState } from "../enums";
import { Db2ConfigOptions } from "../interfaces";
import { Pool, Connection } from "ibm_db";
import { Injectable, Logger } from "@nestjs/common";
import { IConnectionManager } from "../interfaces";
import * as ibm_db from "ibm_db";

@Injectable()
export class Db2ConnectionManager implements IConnectionManager {
  private readonly logger = new Logger(Db2ConnectionManager.name);
  private pool: Pool;
  private state: Db2ConnectionState = Db2ConnectionState.DISCONNECTED;
  private config: Db2ConfigOptions;
  private activeConnections: Connection[] = []; // Track active connections

  constructor(config: Db2ConfigOptions) {
    this.config = config;
    this.pool = new ibm_db.Pool();
    this.initializePool(); // Initialize pool in the constructor
  }

  /**
   * Initialize the connection pool and set the state.
   */
  private initializePool(): void {
    try {
      this.setState(Db2ConnectionState.INITIALIZING);
      this.pool.init(
        this.config.maxPoolSize,
        this.buildConnectionString(this.config)
      );
      this.setState(Db2ConnectionState.CONNECTED);
      this.logger.log("DB2 connection pool initialized successfully");
    } catch (error) {
      this.setState(Db2ConnectionState.ERROR);
      this.logger.error("Failed to initialize connection pool", error.message);
    }
  }

  /**
   * Set the current state of the DB2 connection.
   */
  public setState(state: Db2ConnectionState): void {
    if (this.state !== state) {
      this.logger.log(
        `Connection state updated from ${Db2ConnectionState[this.state]} to ${
          Db2ConnectionState[state]
        }`
      );
      this.state = state;
    }
  }

  /**
   * Get the current state of the DB2 connection.
   */
  public getState(): Db2ConnectionState {
    return this.state;
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

    if (this.state !== Db2ConnectionState.CONNECTED) {
      this.logger.error("Cannot get a connection. The pool is not connected.");
      throw new Error("Connection pool is not connected");
    }

    return new Promise((resolve, reject) => {
      this.pool.open(connectionString, (err: any, conn: Connection) => {
        if (err) {
          this.logger.error("Failed to get connection from pool", err.message);
          reject(err);
        } else {
          this.logger.log("Connection acquired from pool");
          this.activeConnections.push(conn); // Track active connection
          resolve(conn);
        }
      });
    });
  }

  /**
   * Close the connection and remove it from the active connections list.
   */
  public async closeConnection(connection: Connection): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.logger.log("Closing DB2 connection...");
      connection.close((err) => {
        if (err) {
          this.logger.error("Error closing DB2 connection", err.message);
          reject(err);
        } else {
          this.logger.log("DB2 connection closed successfully");

          // Remove the connection from active connections
          const index = this.activeConnections.indexOf(connection);
          if (index > -1) {
            this.activeConnections.splice(index, 1);
          }

          resolve();
        }
      });
    });
  }

  /**
   * Build the DB2 connection string based on the configuration.
   */
  public buildConnectionString(config: Db2ConfigOptions): string {
    const { host, port, database } = config;
    let connStr = `DATABASE=${database};HOSTNAME=${host};PORT=${port};`;

    switch (config.auth.authType) {
      case "password": {
        const { username, password } = config.auth;
        connStr += `UID=${username};PWD=${password};`;
        break;
      }
      case "kerberos": {
        const { username, krbServiceName } = config.auth;
        connStr += `UID=${username};KRB_SERVICE_NAME=${krbServiceName};`;
        break;
      }
      case "jwt": {
        const { jwtToken, jwtSecret } = config.auth;
        connStr += `TOKEN=${jwtToken};JWT_SECRET=${jwtSecret};`;
        break;
      }
      case "ldap": {
        const { username, password, ldapUrl } = config.auth;
        connStr += `UID=${username};PWD=${password};LDAPURL=${ldapUrl};`;
        break;
      }
      default:
        throw new Error(`Unsupported authentication type: ${config.auth}`);
    }

    if (config.useTls) {
      connStr += "SECURITY=SSL;";
      if (config.sslCertificatePath) {
        connStr += `SSLServerCertificate=${config.sslCertificatePath};`;
      }
    }

    this.logger.log(`Connection string built: ${connStr}`);
    return connStr;
  }

  /**
   * Drain the connection pool and release all resources.
   */
  public async drainPool(): Promise<void> {
    if (this.state === Db2ConnectionState.DISCONNECTED) {
      this.logger.warn("Pool is already disconnected.");
      return;
    }

    this.logger.log("Draining DB2 connection pool...");
    this.setState(Db2ConnectionState.DISCONNECTING);

    await new Promise((resolve, reject) => {
      this.pool.close((err) => {
        if (err) {
          this.logger.error(
            "Error while closing the connection pool",
            err.message
          );
          this.setState(Db2ConnectionState.ERROR);
          reject(err);
        } else {
          this.logger.log("DB2 connection pool drained successfully");
          this.setState(Db2ConnectionState.DISCONNECTED);
          resolve(null);
        }
      });
    });
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
        Db2ConnectionState[this.state]
      }`
    );
  }
}
