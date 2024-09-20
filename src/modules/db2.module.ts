// src/modules/db2.module.ts

import { Module, DynamicModule, Global, Logger } from '@nestjs/common';
import { Db2Service } from '../services/db2.service';
import { Db2Client } from '../db/db2-client';
import { TransactionManager } from '../db/transaction-manager';
import { Db2MigrationService } from '../services/migration.service';
import { Db2PoolManager } from '../db/db2-pool.manager';
import { Db2ConnectionManager } from '../db/db2-connection.manger';
import {
  IDb2ConfigOptions,
  IConnectionManager,
  IPoolManager,
  IDb2Client,
  IAuthManager,
  ITransactionManager,
  IDb2MigrationService,
} from '../interfaces';
import {
  CACHE_MANAGER,
  CacheModule,
  CacheModuleOptions,
} from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import {
  I_DB2_CONFIG,
  I_CONNECTION_MANAGER,
  I_POOL_MANAGER,
  I_AUTH_MANAGER,
  I_TRANSACTION_MANAGER,
  I_DB2_MIGRATION_SERVICE,
  I_DB2_CLIENT,
} from '../constants/injection-token.constant';
import { Db2ConfigModule } from './db2-config.module';
import { Db2AuthManager } from '../db';

@Global()
@Module({})
export class Db2Module {
  private static readonly logger = new Logger(Db2Module.name);
  static forRoot(options: IDb2ConfigOptions): DynamicModule {
    return {
      module: Db2Module,
      imports: [
        Db2ConfigModule.forRoot(options),
        CacheModule.registerAsync({
          imports: [Db2ConfigModule],
          inject: [I_DB2_CONFIG],
          useFactory: (config: IDb2ConfigOptions): CacheModuleOptions => {
            if (config.cache?.enabled) {
              const cacheConfig: CacheModuleOptions = {
                store: config.cache.store === 'redis' ? redisStore : 'memory',
                ...(config.cache.store === 'redis' && {
                  socket: {
                    host: config.cache.redisHost,
                    port: config.cache.redisPort,
                  },
                  password: config.cache.redisPassword,
                  ttl: config.cache.ttl || 600, // Default TTL
                }),
                ...(config.cache.store === 'memory' && {
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
        // Config Manager Provider
        {
          provide: I_DB2_CONFIG,
          useValue: options,
        },
        // Pool Manager Provider
        {
          provide: I_POOL_MANAGER,
          useFactory: async (
            config: IDb2ConfigOptions,
          ): Promise<IPoolManager> => {
            this.logger.log('Initializing Db2PoolManager...');
            const poolManager = new Db2PoolManager(config);
            await poolManager.init();
            this.logger.log('Db2PoolManager initialized.');
            return poolManager;
          },
          inject: [I_DB2_CONFIG],
        },
        // Authentication Manager Provider
        {
          provide: I_AUTH_MANAGER,
          useFactory: async (
            config: IDb2ConfigOptions,
            connectionManager: IConnectionManager,
          ): Promise<IAuthManager> => {
            if (!config.auth?.authType) {
              this.logger.error('AuthFactory: No authType found in config.');
              throw new Error('AuthFactory: No authType found in config.');
            }

            const authManager = new Db2AuthManager(config, connectionManager);
            await authManager.init();
            return authManager;
          },
          inject: [I_DB2_CONFIG, I_CONNECTION_MANAGER],
        },
        // Connection Manager Provider
        {
          provide: I_CONNECTION_MANAGER,
          useFactory: async (
            poolManager: IPoolManager,
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
            poolManager: IPoolManager,
          ) => new Db2Client(config, connectionManager, poolManager),
          inject: [I_DB2_CONFIG, I_CONNECTION_MANAGER, I_POOL_MANAGER],
        },

        // DB2 Client Provider
        {
          provide: I_DB2_CLIENT,
          useExisting: Db2Client,
        },

        // TransactionManager Provider
        {
          provide: TransactionManager,
          useFactory: (db2Client: IDb2Client) =>
            new TransactionManager(db2Client),
          inject: [I_DB2_CLIENT],
        },
        // Map I_TRANSACTION_MANAGER to TransactionManager
        {
          provide: I_TRANSACTION_MANAGER,
          useExisting: TransactionManager,
        },
        // Db2MigrationService Provider
        {
          provide: Db2MigrationService,
          useFactory: (
            db2Client: IDb2Client,
            migrationConfig: IDb2ConfigOptions['migration'],
          ) => new Db2MigrationService(db2Client, migrationConfig),
          inject: [I_DB2_CLIENT],
        },
        // Db2Service Provider
        {
          provide: Db2Service,
          useFactory: (
            config: IDb2ConfigOptions,
            cacheManager: Cache,
            transactionManager: ITransactionManager,
            migrationService: IDb2MigrationService,
            connectionManager: IConnectionManager,
            db2Client: IDb2Client,
          ) =>
            new Db2Service(
              config,
              cacheManager,
              transactionManager,
              migrationService,
              connectionManager,
              db2Client,
            ),
          inject: [
            I_DB2_CONFIG,
            CACHE_MANAGER,
            I_TRANSACTION_MANAGER,
            I_DB2_MIGRATION_SERVICE,
            I_CONNECTION_MANAGER,
            I_DB2_CLIENT,
          ],
        },
      ],
      exports: [
        Db2Service,
        I_POOL_MANAGER,
        I_CONNECTION_MANAGER,
        I_DB2_CLIENT,
        I_TRANSACTION_MANAGER,
        I_DB2_MIGRATION_SERVICE,
        I_AUTH_MANAGER,
        I_DB2_CONFIG,
      ],
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
        // Register CacheModule asynchronously
        CacheModule.registerAsync({
          imports: [Db2ConfigModule], // Import Db2ConfigModule to access DB2_CONFIG
          inject: [I_DB2_CONFIG], // Inject DB2_CONFIG into the useFactory
          useFactory: (config: IDb2ConfigOptions): CacheModuleOptions => {
            if (config.cache?.enabled) {
              const cacheConfig: CacheModuleOptions = {
                store: config.cache.store === 'redis' ? redisStore : 'memory',
                ...(config.cache.store === 'redis' && {
                  socket: {
                    host: config.cache.redisHost,
                    port: config.cache.redisPort,
                  },
                  password: config.cache.redisPassword,
                  ttl: config.cache.ttl || 600, // Default TTL
                }),
                ...(config.cache.store === 'memory' && {
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
        // Config Manager Provider
        {
          provide: I_DB2_CONFIG,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        // Pool Manager Provider
        {
          provide: I_POOL_MANAGER,
          useFactory: async (
            config: IDb2ConfigOptions,
          ): Promise<IPoolManager> => {
            this.logger.log('Initializing Db2PoolManager...');
            const poolManager = new Db2PoolManager(config);
            await poolManager.init();
            this.logger.log('Db2PoolManager initialized.');
            return poolManager;
          },
          inject: [I_DB2_CONFIG],
        },
        // Authentication Manager Provider
        {
          provide: I_AUTH_MANAGER,
          useFactory: async (
            config: IDb2ConfigOptions,
            connectionManager: IConnectionManager,
          ): Promise<IAuthManager> => {
            if (!config.auth?.authType) {
              this.logger.error('AuthFactory: No authType found in config.');
              throw new Error('AuthFactory: No authType found in config.');
            }

            const authManager = new Db2AuthManager(config, connectionManager);
            await authManager.init();
            return authManager;
          },
          inject: [I_DB2_CONFIG, I_CONNECTION_MANAGER],
        },
        // Connection Manager Provider
        {
          provide: I_CONNECTION_MANAGER,
          useFactory: async (
            poolManager: IPoolManager,
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
            poolManager: IPoolManager,
          ) => new Db2Client(config, connectionManager, poolManager),
          inject: [I_DB2_CONFIG, I_CONNECTION_MANAGER, I_POOL_MANAGER],
        },

        // DB2 Client Provider
        {
          provide: I_DB2_CLIENT,
          useExisting: Db2Client,
        },

        // TransactionManager Provider
        {
          provide: TransactionManager,
          useFactory: (db2Client: IDb2Client) =>
            new TransactionManager(db2Client),
          inject: [I_DB2_CLIENT],
        },

        // Migration Service Provider
        {
          provide: I_DB2_MIGRATION_SERVICE,
          useFactory: (
            db2Client: IDb2Client,
            migrationConfig: IDb2ConfigOptions['migration'],
          ) => new Db2MigrationService(db2Client, migrationConfig),
          inject: [I_DB2_CLIENT],
        },

        // Map I_TRANSACTION_MANAGER to TransactionManager
        {
          provide: I_TRANSACTION_MANAGER,
          useExisting: TransactionManager,
        },
        // Db2MigrationService Provider
        {
          provide: Db2MigrationService,
          useFactory: (
            db2Client: IDb2Client,
            migrationConfig: IDb2ConfigOptions['migration'],
          ) => new Db2MigrationService(db2Client, migrationConfig),
          inject: [I_DB2_CLIENT],
        },
        // Db2Service Provider
        {
          provide: Db2Service,
          useFactory: (
            config: IDb2ConfigOptions,
            cacheManager: Cache,
            transactionManager: ITransactionManager,
            migrationService: IDb2MigrationService,
            connectionManager: IConnectionManager,
            db2Client: IDb2Client,
          ) =>
            new Db2Service(
              config,
              cacheManager,
              transactionManager,
              migrationService,
              connectionManager,
              db2Client,
            ),
          inject: [
            I_DB2_CONFIG,
            CACHE_MANAGER,
            I_TRANSACTION_MANAGER,
            I_DB2_MIGRATION_SERVICE,
            I_CONNECTION_MANAGER,
            I_DB2_CLIENT,
          ],
        },
      ],
      exports: [
        Db2Service,
        I_POOL_MANAGER,
        I_CONNECTION_MANAGER,
        I_DB2_CLIENT,
        I_TRANSACTION_MANAGER,
        I_DB2_MIGRATION_SERVICE,
        I_AUTH_MANAGER,
        I_DB2_CONFIG,
      ],
    };
  }
}
