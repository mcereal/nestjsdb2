// src/services/db2.service.ts

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
import { Db2QueryBuilder } from "../db/db2-query-builder";
import { formatDb2Error } from "src/utils/db2.utils";
import { Db2Error } from "../../src/errors/db2.error";
import { Cache } from "cache-manager";
import { Db2Client } from "src/db/db2-client";
import { TransactionManager } from "../db/transaction-manager";

@Injectable()
export class Db2Service
  implements Db2ConnectionInterface, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(Db2Service.name);
  private client: Db2Client;
  private cache?: Cache;
  private transactionManager: TransactionManager;

  private options: Db2ConfigOptions;

  constructor(options: Db2ConfigOptions, cache?: Cache) {
    this.options = options;
    this.cache = cache;
    this.client = new Db2Client(this.options);
    this.transactionManager = new TransactionManager(this.client);
  }

  async onModuleInit(): Promise<void> {
    this.logger.log("Initializing Db2Service...");
    this.validateConfig(this.options);
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log("Destroying Db2Service...");
    try {
      await this.client.drainPool();
      await this.disconnect();
    } catch (error) {
      this.handleError(error, "Module Destroy");
    }
  }

  getState(): Db2ConnectionState {
    return this.client.getState();
  }

  getActiveConnectionsCount(): number {
    return this.client.getActiveConnectionsCount();
  }

  async checkHealth(): Promise<boolean> {
    return await this.client.checkHealth();
  }

  createQueryBuilder(): Db2QueryBuilder {
    return new Db2QueryBuilder();
  }

  async runMigration(script: string): Promise<void> {
    try {
      await this.client.query(script);
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
      return await this.client.executePreparedStatement<T>(sql, params);
    } catch (error) {
      this.handleError(error, "Execute Prepared Statement");
    }
  }

  async drainPool(): Promise<void> {
    await this.client.drainPool();
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      this.handleError(error, "Connection");
    }
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
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
      const result = await this.client.query<T>(sql, params, timeout);
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
      !options.auth.username ||
      !options.auth.password ||
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
    if (options.auth.authType === "jwt" && !options.auth.jwtToken) {
      throw new Error("JWT authentication requires a valid JWT token path.");
    }
    if (options.auth.authType === "kerberos" && !options.auth.krbServiceName) {
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
