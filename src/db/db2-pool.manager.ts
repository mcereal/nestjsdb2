import { Pool, Connection } from "ibm_db";
import { Logger } from "@nestjs/common";
import { Db2ConfigOptions } from "../interfaces";
import * as ibm_db from "ibm_db";

export class Db2PoolManager {
  private readonly logger = new Logger(Db2PoolManager.name);
  private pool: Pool;
  private activeConnections: Connection[] = [];

  constructor(private config: Db2ConfigOptions) {
    this.pool = new ibm_db.Pool();
    this.initializePool();
  }

  private initializePool(): void {
    try {
      this.logger.log("Initializing DB2 connection pool...");
      const connectionString = this.buildConnectionString(this.config);
      this.pool.init(this.config.maxPoolSize, connectionString);
      this.logger.log("DB2 connection pool initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize connection pool", error.message);
    }
  }

  public get getPool(): Pool {
    if (!this.pool) {
      this.initializePool();
    }
    return this.pool;
  }

  public async getConnection(): Promise<Connection> {
    return new Promise((resolve, reject) => {
      this.pool.open(
        this.buildConnectionString(this.config),
        (err, connection) => {
          if (err) {
            this.logger.error(
              "Failed to get connection from pool",
              err.message
            );
            reject(err);
          } else {
            this.logger.log("Connection acquired from pool");
            this.activeConnections.push(connection);
            resolve(connection);
          }
        }
      );
    });
  }

  public async closeConnection(connection: Connection): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (connection) {
        connection.close((err) => {
          if (err) {
            this.logger.error("Error closing DB2 connection", err.message);
            reject(err);
          } else {
            this.logger.log("DB2 connection closed successfully");
            const index = this.activeConnections.indexOf(connection);
            if (index > -1) {
              this.activeConnections.splice(index, 1);
            }
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  public async drainPool(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.pool.close((err) => {
        if (err) {
          this.logger.error("Error closing DB2 pool", err.message);
          reject(err);
        } else {
          this.logger.log("DB2 pool drained successfully");
          resolve();
        }
      });
    });
  }

  private buildConnectionString(config: Db2ConfigOptions): string {
    const { host, port, database, auth, useTls, sslCertificatePath } = config;
    let connStr = `DATABASE=${database};HOSTNAME=${host};PORT=${port};`;
    switch (auth.authType) {
      case "password":
        connStr += `UID=${auth.username};PWD=${auth.password};`;
        break;
      case "jwt":
        connStr += `TOKEN=${auth.jwtToken};`;
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
