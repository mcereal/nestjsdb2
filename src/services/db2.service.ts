// src/services/db2.service.ts

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  Optional,
} from "@nestjs/common";
import {
  Db2CacheOptions,
  Db2ConfigOptions,
  Db2ServiceInterface,
} from "../interfaces";
import { Db2ConnectionState } from "../enums";
import { Db2QueryBuilder, Db2Client, TransactionManager } from "../db";
import { handleDb2Error } from "../errors";
import { Cache, caching } from "cache-manager";
import { redisStore } from "cache-manager-redis-yet";
import { Db2MigrationService } from "./";
import { CACHE_MANAGER } from "@nestjs/cache-manager";

@Injectable()
export class Db2Service
  implements Db2ServiceInterface, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(Db2Service.name);
  private options: Db2ConfigOptions;
  private client: Db2Client;
  private cache?: Cache;
  private transactionManager: TransactionManager;
  private migrationService: Db2MigrationService;

  public constructor(
    options: Db2ConfigOptions,
    @Optional() @Inject(CACHE_MANAGER) cacheManager: Cache,
    transactionManager: TransactionManager,
    migrationService: Db2MigrationService
  ) {
    this.options = options;
    this.transactionManager = transactionManager;
    this.migrationService = migrationService;

    if (options.cache?.enabled) {
      this.cache = cacheManager;
      this.logger.log("Cache manager initialized.");
    } else {
      this.logger.log("Caching is disabled.");
    }

    this.client = new Db2Client(this.options);

    if (options.cache?.enabled) {
      this.initializeCache(options.cache);
    } else {
      this.logger.log("Caching is disabled.");
    }
  }

  public async onModuleInit(): Promise<void> {
    this.logger.log("Initializing Db2Service...");
    this.validateConfig(this.options);
    try {
      await this.connect();

      // Run migrations if enabled
      if (this.options.migration?.enabled) {
        await this.migrationService.runMigrations();
        this.logger.log("Migrations completed successfully.");
      }
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, "Module Initialization", options, this.logger);
    }
  }

  public async onModuleDestroy(): Promise<void> {
    this.logger.log("Destroying Db2Service...");
    try {
      await this.client.drainPool();
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(
        error,
        "Drain Pool during Module Destroy",
        options,
        this.logger
      );
    }

    try {
      await this.client.disconnect();
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(
        error,
        "Disconnect during Module Destroy",
        options,
        this.logger
      );
    }

    if (this.cache) {
      try {
        if (this.options.cache?.resetOnDestroy) {
          await this.cache.reset();
          this.logger.log("Cache reset successfully.");
        }

        const cacheStore = this.cache.store as any;
        if (typeof cacheStore.disconnect === "function") {
          await cacheStore.disconnect();
          this.logger.log("Cache store connection closed.");
        }
      } catch (error) {
        const options = {
          host: this.options.host,
          database: this.options.database,
        };
        handleDb2Error(
          error,
          "Cache Cleanup during Module Destroy",
          options,
          this.logger
        );
      }
    }
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, "Connection", options, this.logger);
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, "Disconnection", options, this.logger);
    }
  }

  public async drainPool(): Promise<void> {
    try {
      await this.client.drainPool();
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, "Drain Pool", options, this.logger);
    }
  }

  public getState(): Db2ConnectionState {
    return this.client.getState();
  }

  public getActiveConnectionsCount(): number {
    return this.client.getActiveConnectionsCount();
  }

  private async initializeCache(cacheOptions: Db2CacheOptions): Promise<void> {
    if (cacheOptions.store === "redis") {
      this.cache = await caching(redisStore, {
        host: cacheOptions.redisHost,
        port: cacheOptions.redisPort,
        password: cacheOptions.redisPassword,
        ttl: cacheOptions.ttl || 600, // Default to 10 minutes if not set
      });
      this.logger.log("Redis cache initialized.");
    } else {
      // Default to in-memory cache
      this.cache = await caching("memory", {
        max: cacheOptions.max || 100, // Default max items
        ttl: cacheOptions.ttl || 600, // Default to 10 minutes if not set
      });
      this.logger.log("In-memory cache initialized.");
    }
  }

  public async clearCache(sql: string, params: any[] = []): Promise<boolean> {
    if (this.cache) {
      try {
        const cacheKey = this.generateCacheKey(sql, params);
        await this.cache.del(cacheKey);
        this.logger.log(`Cache cleared for query: ${sql}`);
        return true;
      } catch (error) {
        const options = {
          host: this.options.host,
          database: this.options.database,
        };
        handleDb2Error(error, "Cache Clear", options, this.logger);
        return false;
      }
    }
    return false;
  }

  private generateCacheKey(sql: string, params: any[]): string {
    const paramsKey = params.map((p) => JSON.stringify(p)).join(":");
    return `${sql}:${paramsKey}`;
  }

  public async checkHealth(): Promise<{
    dbHealth: boolean;
    transactionActive: boolean;
  }> {
    this.logger.log("Performing service-level health check...");

    try {
      const dbHealth = await this.client.checkHealth();

      // Check if a transaction is currently active
      const transactionActive = this.transactionManager
        ? this.transactionManager.isTransactionActive()
        : false;

      return {
        dbHealth,
        transactionActive,
      };
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, "Service Health Check", options, this.logger);
      return { dbHealth: false, transactionActive: false };
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

  public async query<T>(
    sql: string,
    params: any[] = [],
    timeout?: number
  ): Promise<T> {
    const start = Date.now();
    if (this.cache) {
      const cacheKey = this.generateCacheKey(sql, params);
      const cachedResult = await this.cache.get<T>(cacheKey);
      if (cachedResult) {
        this.logger.log(`Cache hit for query: ${sql}`);
        return cachedResult;
      }
    }

    const result = await this.client.query<T>(sql, params, timeout);

    if (this.cache) {
      const cacheKey = this.generateCacheKey(sql, params);
      await this.cache.set(cacheKey, result);
      this.logger.log(`Cache set for query: ${sql}`);
    }
    const duration = Date.now() - start;

    if (this.options.logging?.logQueries || this.options.logging?.profileSql) {
      this.logQueryDetails(sql, params, duration); // Log query details
    }
    return result;
  }

  public async executePreparedStatement<T>(
    sql: string,
    params: any[] = []
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await this.client.executePreparedStatement<T>(sql, params);

      const duration = Date.now() - start;

      if (
        this.options.logging?.logQueries ||
        this.options.logging?.profileSql
      ) {
        this.logQueryDetails(sql, params, duration);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;

      if (this.options.logging?.logErrors || this.options.logging?.profileSql) {
        this.logQueryDetails(sql, params, duration, error);
      }
      const options = {
        host: this.options.host,
        database: this.options.database,
      };

      handleDb2Error(error, "Execute Prepared Statement", options, this.logger);
    }
  }

  public async batchInsert(
    tableName: string,
    columns: string[],
    valuesArray: any[][]
  ): Promise<void> {
    const start = Date.now();
    try {
      await this.client.batchInsert(tableName, columns, valuesArray);

      const duration = Date.now() - start;
      if (
        this.options.logging?.logQueries ||
        this.options.logging?.profileSql
      ) {
        this.logQueryDetails("Batch Insert Operation", valuesArray, duration);
      }
    } catch (error) {
      const duration = Date.now() - start;
      if (this.options.logging?.logErrors || this.options.logging?.profileSql) {
        this.logQueryDetails(
          "Batch Insert Operation",
          valuesArray,
          duration,
          error
        );
      }
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, "Batch Insert", options, this.logger);
    }
  }

  public async batchUpdate(
    tableName: string,
    columns: string[],
    valuesArray: any[][],
    whereClause: string
  ): Promise<void> {
    const start = Date.now();
    try {
      await this.client.batchUpdate(
        tableName,
        columns,
        valuesArray,
        whereClause
      );

      const duration = Date.now() - start; // Calculate execution duration
      if (
        this.options.logging?.logQueries ||
        this.options.logging?.profileSql
      ) {
        this.logQueryDetails("Batch Update Operation", valuesArray, duration);
      }
    } catch (error) {
      const duration = Date.now() - start; // Calculate execution duration
      if (this.options.logging?.logErrors || this.options.logging?.profileSql) {
        this.logQueryDetails(
          "Batch Update Operation",
          valuesArray,
          duration,
          error
        );
      }
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, "Batch Update", options, this.logger);
    }
  }

  public async beginTransaction(): Promise<void> {
    try {
      await this.transactionManager.beginTransaction();
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, "Begin Transaction", options, this.logger);
    }
  }

  public async commitTransaction(): Promise<void> {
    try {
      await this.transactionManager.commitTransaction();
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, "Commit Transaction", options, this.logger);
    }
  }

  public async rollbackTransaction(): Promise<void> {
    try {
      await this.transactionManager.rollbackTransaction();
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, "Rollback Transaction", options, this.logger);
    }
  }

  public async runMigration(script: string): Promise<void> {
    try {
      await this.client.query(script);
      this.logger.log("Migration script executed successfully.");
    } catch (error) {
      const options = {
        host: this.options.host,
        database: this.options.database,
      };
      handleDb2Error(error, "Migration Execution", options, this.logger);
    }
  }

  public createQueryBuilder(): Db2QueryBuilder {
    return new Db2QueryBuilder();
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
}
