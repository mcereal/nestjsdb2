import { Connection } from "ibm_db";
import { Logger } from "@nestjs/common";
import { IDb2ConfigOptions, IPoolManager } from "../interfaces";
import { Pool, createPool } from "generic-pool";
import * as ibm_db from "ibm_db";

export class Db2PoolManager implements IPoolManager {
  private readonly logger = new Logger(Db2PoolManager.name);
  private pool: Pool<Connection>;
  protected poolInitialized = false;

  constructor(private config: IDb2ConfigOptions) {}

  public async init(): Promise<void> {
    this.validateConfig(this.config);
    await this.initializePool();
  }

  public async initializePool(): Promise<void> {
    this.validateConfig(this.config);
    this.pool = createPool(
      {
        create: () => {
          return new Promise<Connection>((resolve, reject) => {
            const connectionString = this.buildConnectionString(this.config);
            ibm_db.open(connectionString, (err, connection) => {
              if (err) {
                this.logger.error(
                  "Failed to create DB2 connection",
                  err.message
                );
                reject(err);
              } else {
                this.logger.log("New DB2 connection created");
                resolve(connection);
              }
            });
          });
        },
        destroy: (connection: Connection) => {
          return new Promise<void>((resolve, reject) => {
            connection.close((err) => {
              if (err) {
                this.logger.error(
                  "Failed to close DB2 connection",
                  err.message
                );
                reject(err);
              } else {
                this.logger.log("DB2 connection closed");
                resolve();
              }
            });
          });
        },
      },
      {
        max: this.config.maxPoolSize || 10,
        min: this.config.minPoolSize || 1,
        idleTimeoutMillis: 30000, // 30 seconds
        evictionRunIntervalMillis: 15000, // 15 seconds
      }
    );

    this.poolInitialized = true;
    this.logger.log("Connection pool initialized successfully.");
  }

  private validateConfig(config: IDb2ConfigOptions): void {
    if (!config.host || !config.port || !config.auth || !config.database) {
      throw new Error(
        "Invalid configuration: Host, port, auth, and database are required."
      );
    }
    if (config.useTls && !config.sslCertificatePath) {
      throw new Error(
        "TLS is enabled, but no SSL certificate path is provided."
      );
    }
    if (
      config.auth.authType === "jwt" &&
      "jwtToken" in config.auth &&
      !config.auth.jwtToken
    ) {
      throw new Error("JWT authentication requires a valid JWT token.");
    }
    if (
      config.auth.authType === "kerberos" &&
      "krbServiceName" in config.auth &&
      !config.auth.krbServiceName
    ) {
      throw new Error("Kerberos authentication requires a service name.");
    }
    // Add more validations as needed
  }

  public static async create(
    config: IDb2ConfigOptions
  ): Promise<Db2PoolManager> {
    const manager = new Db2PoolManager(config);
    await manager.init();
    return manager;
  }

  public get getPool(): Pool<Connection> {
    if (!this.poolInitialized || !this.pool) {
      this.logger.error("DB2 connection pool is not initialized.");
      throw new Error("DB2 connection pool is not initialized.");
    } else {
      this.logger.log("DB2 connection pool already initialized.");
      return this.pool;
    }
  }

  public get isPoolInitialized(): boolean {
    return this.poolInitialized;
  }

  public async getConnection(): Promise<Connection> {
    if (!this.poolInitialized || !this.pool) {
      this.logger.error("DB2 connection pool is not initialized.");
      throw new Error("DB2 connection pool is not initialized.");
    } else {
      this.logger.log("DB2 connection pool is already initialized.");
    }

    try {
      this.logger.log("Db2PoolManager: Acquiring connection from pool...");
      const connection = await this.pool.acquire();
      this.logger.log("Db2PoolManager: Connection acquired from pool.");
      return connection;
    } catch (error) {
      this.logger.error(
        "Db2PoolManager: Failed to acquire connection from pool.",
        error.message
      );
      throw error;
    }
  }

  public async closeConnection(connection: Connection): Promise<void> {
    if (this.poolInitialized) {
      await this.pool.release(connection);
      this.logger.log("Connection released back to pool.");
    }
  }

  public async drainPool(): Promise<void> {
    try {
      await this.pool.drain();
      await this.pool.clear();
      this.poolInitialized = false;
      this.logger.log("Connection pool drained and cleared.");
    } catch (error) {
      this.logger.error("Failed to drain connection pool.", error.message);
      throw error;
    }
  }

  /**
   * Releases a connection back to the pool.
   */
  public async releaseConnection(connection: Connection): Promise<void> {
    if (this.poolInitialized) {
      await this.pool.release(connection);
      this.logger.log("Connection released back to custom pool.");
    }
  }

  private buildConnectionString(config: IDb2ConfigOptions): string {
    const { host, port, database, auth, useTls, sslCertificatePath } = config;
    let connStr = `DATABASE=${database};HOSTNAME=${host};PORT=${port};`;
    switch (auth.authType) {
      case "password":
        connStr += `UID=${auth.username};PWD=${auth.password};`;
        break;
      case "jwt":
        if ("jwtToken" in auth) {
          connStr += `TOKEN=${auth.jwtToken};`;
        }
        break;
      // Handle other auth types...
    }
    if (useTls) {
      connStr += "SECURITY=SSL;";
      if (sslCertificatePath) {
        connStr += `SSLServerCertificate=${sslCertificatePath};`;
      }
    }
    return connStr;
  }
}
