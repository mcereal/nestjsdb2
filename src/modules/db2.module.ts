// src/modules/db2.module.ts

import { Module, DynamicModule, Global } from "@nestjs/common";
import { Db2Service } from "../services/db2.service";
import { Db2Client } from "../db/db2-client";
import { TransactionManager } from "../db/transaction-manager";
import { Db2MigrationService } from "../services/migration.service";
import { Db2PoolManager } from "../db/db2-pool.manager";
import { Db2ConnectionManager } from "../db/db2-connection.manger";
import {
  IDb2ConfigOptions,
  IConnectionManager,
  IPoolManager,
  IDb2Client,
} from "../interfaces";
import {
  CACHE_MANAGER,
  CacheModule,
  CacheModuleOptions,
} from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { redisStore } from "cache-manager-redis-yet";
import {
  DB2_CONFIG,
  I_CONNECTION_MANAGER,
  I_POOL_MANAGER,
} from "../constants/injection-token.constant";
import { Db2ConfigModule } from "./db2-config.module";

@Global()
@Module({})
export class Db2Module {
  static forRoot(options: IDb2ConfigOptions): DynamicModule {
    return {
      module: Db2Module,
      imports: [
        // Import Db2ConfigModule with provided options
        Db2ConfigModule.forRoot(options),
        // Register CacheModule asynchronously
        CacheModule.registerAsync({
          imports: [Db2ConfigModule], // Import Db2ConfigModule to access DB2_CONFIG
          inject: [DB2_CONFIG], // Inject DB2_CONFIG into the useFactory
          useFactory: (config: IDb2ConfigOptions): CacheModuleOptions => {
            if (config.cache?.enabled) {
              const cacheConfig: CacheModuleOptions = {
                store: config.cache.store === "redis" ? redisStore : "memory",
                ...(config.cache.store === "redis" && {
                  socket: {
                    host: config.cache.redisHost,
                    port: config.cache.redisPort,
                  },
                  password: config.cache.redisPassword,
                  ttl: config.cache.ttl || 600, // Default TTL
                }),
                ...(config.cache.store === "memory" && {
                  max: config.cache.max || 100,
                  ttl: config.cache.ttl || 600,
                }),
              };

              return cacheConfig;
            }

            return {}; // Default cache configuration if caching is disabled
          },
        }),
      ],
      providers: [
        // Pool Manager Provider
        {
          provide: I_POOL_MANAGER,
          useFactory: async (
            config: IDb2ConfigOptions
          ): Promise<IPoolManager> => {
            const poolManager = new Db2PoolManager(config);
            await poolManager.init();
            return poolManager;
          },
          inject: [DB2_CONFIG],
        },
        // Connection Manager Provider
        {
          provide: I_CONNECTION_MANAGER,
          useFactory: async (
            poolManager: IPoolManager
          ): Promise<IConnectionManager> => {
            const connectionManager = new Db2ConnectionManager(poolManager);
            await connectionManager.init();
            return connectionManager;
          },
          inject: [I_POOL_MANAGER],
        },
        // Db2Client Provider
        {
          provide: Db2Client,
          useFactory: (
            config: IDb2ConfigOptions,
            connectionManager: IConnectionManager,
            poolManager: IPoolManager
          ) => new Db2Client(config, connectionManager, poolManager),
          inject: [DB2_CONFIG, I_CONNECTION_MANAGER, I_POOL_MANAGER],
        },
        // TransactionManager Provider
        {
          provide: TransactionManager,
          useFactory: (db2Client: IDb2Client) =>
            new TransactionManager(db2Client),
          inject: [Db2Client],
        },
        // Db2MigrationService Provider
        {
          provide: Db2MigrationService,
          useFactory: (
            db2Client: IDb2Client,
            migrationConfig: IDb2ConfigOptions["migration"]
          ) => new Db2MigrationService(db2Client, migrationConfig),
          inject: [Db2Client],
        },
        // Db2Service Provider
        {
          provide: Db2Service,
          useFactory: (
            config: IDb2ConfigOptions,
            cacheManager: Cache,
            transactionManager: TransactionManager,
            migrationService: Db2MigrationService,
            connectionManager: IConnectionManager,
            db2Client: IDb2Client
          ) =>
            new Db2Service(
              config, // Pass the config directly
              cacheManager,
              transactionManager,
              migrationService,
              connectionManager,
              db2Client
            ),
          inject: [
            DB2_CONFIG, // Inject config
            CACHE_MANAGER,
            TransactionManager,
            Db2MigrationService,
            I_CONNECTION_MANAGER,
            Db2Client,
          ],
        },
      ],
      exports: [Db2Service],
    };
  }

  static forRootAsync(options: {
    imports?: any[];
    useFactory: (
      ...args: any[]
    ) => Promise<IDb2ConfigOptions> | IDb2ConfigOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: Db2Module,
      imports: [
        ...(options.imports || []),
        Db2ConfigModule.forRootAsync({
          useFactory: options.useFactory,
          inject: options.inject || [],
        }),

        CacheModule.registerAsync({
          imports: [Db2ConfigModule],
          inject: [DB2_CONFIG],
          useFactory: (config: IDb2ConfigOptions): CacheModuleOptions => {
            if (config.cache?.enabled) {
              const cacheConfig: CacheModuleOptions = {
                store: config.cache.store === "redis" ? redisStore : "memory",
                ...(config.cache.store === "redis" && {
                  socket: {
                    host: config.cache.redisHost,
                    port: config.cache.redisPort,
                  },
                  password: config.cache.redisPassword,
                  ttl: config.cache.ttl || 600, // Default TTL
                }),
                ...(config.cache.store === "memory" && {
                  max: config.cache.max || 100,
                  ttl: config.cache.ttl || 600,
                }),
              };

              return cacheConfig;
            }

            return {}; // Default cache configuration if caching is disabled
          },
        }),
      ],
      providers: [
        // Pool Manager Provider
        {
          provide: I_POOL_MANAGER,
          useFactory: async (
            config: IDb2ConfigOptions
          ): Promise<IPoolManager> => {
            const poolManager = new Db2PoolManager(config);
            await poolManager.init();
            return poolManager;
          },
          inject: [DB2_CONFIG],
        },
        // Connection Manager Provider
        {
          provide: I_CONNECTION_MANAGER,
          useFactory: async (
            poolManager: IPoolManager
          ): Promise<IConnectionManager> => {
            const connectionManager = new Db2ConnectionManager(poolManager);
            await connectionManager.init();
            return connectionManager;
          },
          inject: [I_POOL_MANAGER],
        },
        // Db2Client Provider
        {
          provide: Db2Client,
          useFactory: (
            config: IDb2ConfigOptions,
            connectionManager: IConnectionManager,
            poolManager: IPoolManager
          ) => new Db2Client(config, connectionManager, poolManager),
          inject: [DB2_CONFIG, I_CONNECTION_MANAGER, I_POOL_MANAGER],
        },
        // TransactionManager Provider
        {
          provide: TransactionManager,
          useFactory: (db2Client: IDb2Client) =>
            new TransactionManager(db2Client),
          inject: [Db2Client],
        },
        // Db2MigrationService Provider
        {
          provide: Db2MigrationService,
          useFactory: (
            db2Client: IDb2Client,
            migrationConfig: IDb2ConfigOptions["migration"]
          ) => new Db2MigrationService(db2Client, migrationConfig),
          inject: [Db2Client],
        },
        // Db2Service Provider
        {
          provide: Db2Service,
          useFactory: (
            config: IDb2ConfigOptions,
            cacheManager: Cache,
            transactionManager: TransactionManager,
            migrationService: Db2MigrationService,
            connectionManager: IConnectionManager,
            db2Client: IDb2Client
          ) =>
            new Db2Service(
              config,
              cacheManager,
              transactionManager,
              migrationService,
              connectionManager,
              db2Client
            ),
          inject: [
            DB2_CONFIG, // Inject config
            CACHE_MANAGER,
            TransactionManager,
            Db2MigrationService,
            I_CONNECTION_MANAGER,
            Db2Client,
          ],
        },
      ],
      exports: [Db2Service],
    };
  }
}
