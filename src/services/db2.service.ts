import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import {
  Db2ConfigOptions,
  Db2ConnectionInterface,
} from "../interfaces/db2.interface";
import { Db2ConnectionState } from "../enums/db2.enums";
import { Db2QueryBuilder } from "./db2.query-builder";
import { formatDb2Error } from "src/utils/db2.utils";
import { Db2Error } from "../../src/errors/db2.error";
import { Cache } from "cache-manager";
import { Db2Connection } from "src/db/db2-connection"; // Updated to use your custom Db2Connection
import { TransactionManager } from "../db/transaction-manager"; // Updated to use your custom TransactionManager

@Injectable()
export class Db2Service
  implements Db2ConnectionInterface, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(Db2Service.name);
  private connection: Db2Connection; // Using the new Db2Connection
  private cache?: Cache; // Optional cache instance
  private transactionManager: TransactionManager; // Using the new TransactionManager

  // Configuration options passed directly to the constructor
  private options: Db2ConfigOptions;

  constructor(options: Db2ConfigOptions, cache?: Cache) {
    this.options = options;
    this.cache = cache;
    this.connection = new Db2Connection(this.options);
    this.transactionManager = new TransactionManager(this.connection);
  }

  async onModuleInit(): Promise<void> {
    this.logger.log("Initializing Db2Service...");
    this.validateConfig(this.options);
    await this.connect(); // Using the new connect method
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log("Destroying Db2Service...");
    try {
      await this.connection.drainPool();
      await this.disconnect();
    } catch (error) {
      this.handleError(error, "Module Destroy");
    }
  }

  getState(): Db2ConnectionState {
    return this.connection.getState();
  }

  getActiveConnectionsCount(): number {
    return this.connection.getActiveConnectionsCount();
  }

  async checkHealth(): Promise<boolean> {
    return await this.connection.checkHealth();
  }

  /**
   * Create a new query builder instance.
   * @returns A new instance of the Db2QueryBuilder class.
   */
  createQueryBuilder(): Db2QueryBuilder {
    return new Db2QueryBuilder();
  }

  async runMigration(script: string): Promise<void> {
    try {
      await this.connection.query(script);
      this.logger.log("Migration script executed successfully.");
    } catch (error) {
      this.logger.error("Error executing migration script:", error.message);
      this.handleError(error, "Migration");
    }
  }

  async executePreparedStatement<T>(
    sql: string,
    params: any[] = []
  ): Promise<T> {
    try {
      return await this.connection.executePreparedStatement<T>(sql, params);
    } catch (error) {
      this.handleError(error, "Execute Prepared Statement");
    }
  }

  async drainPool(): Promise<void> {
    await this.connection.drainPool();
  }

  async connect(): Promise<void> {
    try {
      await this.connection.connect();
    } catch (error) {
      this.handleError(error, "Connection");
    }
  }

  async disconnect(): Promise<void> {
    await this.connection.disconnect();
  }

  private handleError(error: any, context: string): void {
    const errorMessage = formatDb2Error(error, context, {
      host: this.options.host,
      database: this.options.database,
    });

    const structuredError = {
      context,
      message: errorMessage,
      host: this.options.host,
      database: this.options.database,
      timestamp: new Date().toISOString(),
    };

    this.logger.error(JSON.stringify(structuredError));
    throw new Db2Error(errorMessage); // Throw a custom Db2 error
  }

  async query<T>(
    sql: string,
    params: any[] = [],
    timeout?: number
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await this.connection.query<T>(sql, params, timeout);
      this.logQueryDetails(sql, params, Date.now() - startTime);
      return result;
    } catch (error) {
      this.logQueryDetails(sql, params, Date.now() - startTime, error);
      this.handleError(error, "Query");
      throw error;
    }
  }

  async beginTransaction(): Promise<void> {
    try {
      await this.transactionManager.beginTransaction();
    } catch (error) {
      this.handleError(error, "Begin Transaction");
    }
  }

  async commitTransaction(): Promise<void> {
    try {
      await this.transactionManager.commitTransaction();
    } catch (error) {
      this.handleError(error, "Commit Transaction");
    }
  }

  async rollbackTransaction(): Promise<void> {
    try {
      await this.transactionManager.rollbackTransaction();
    } catch (error) {
      this.handleError(error, "Rollback Transaction");
    }
  }

  private validateConfig(options: Db2ConfigOptions): void {
    if (
      !options.host ||
      !options.port ||
      !options.username ||
      !options.password ||
      !options.database
    ) {
      throw new Error(
        "Invalid configuration: Host, port, username, password, and database are required."
      );
    }
    if (options.useTls && !options.sslCertificatePath) {
      throw new Error(
        "TLS is enabled, but no SSL certificate path is provided."
      );
    }
    if (options.authType === "jwt" && !options.jwtTokenPath) {
      throw new Error("JWT authentication requires a valid JWT token path.");
    }
    if (options.authType === "kerberos" && !options.kerberosServiceName) {
      throw new Error("Kerberos authentication requires a service name.");
    }
  }

  private logQueryDetails(
    sql: string,
    params: any[],
    duration: number,
    error?: any
  ): void {
    const logMessage = {
      query: sql,
      params: params,
      duration: `${duration} ms`,
      error: error ? error.message : null,
    };

    this.logger.log(JSON.stringify(logMessage));
  }

  async clearCache(sql: string, params: any[] = []): Promise<boolean> {
    if (this.cache) {
      try {
        const cacheKey = this.generateCacheKey(sql, params);
        await this.cache.del(cacheKey);
        this.logger.log(`Cache cleared for query: ${sql}`);
        return true;
      } catch (error) {
        this.logger.error("Error clearing cache:", error.message);
        return false;
      }
    }
    return false; // or throw an error if cache is not defined
  }

  private generateCacheKey(sql: string, params: any[]): string {
    const paramsKey = params.map((p) => JSON.stringify(p)).join(":");
    return `${sql}:${paramsKey}`;
  }
}
