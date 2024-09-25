import { Module, DynamicModule, Global } from '@nestjs/common';
import { Db2Service } from '../services/db2.service';
import { Db2Client } from '../db/db2-client';
import { TransactionManager } from '../db/transaction-manager';
import { Db2MigrationService } from '../services/migration.service';
import { Db2PoolManager } from '../db/db2-pool.manager';
import { Db2ConnectionManager } from '../db/db2-connection.manger';
import { IDb2ConfigOptions, IConnectionManager } from '../interfaces';
import { CacheModule, CacheModuleOptions } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import {
  I_DB2_CONFIG,
  I_CONNECTION_MANAGER,
  I_POOL_MANAGER,
  I_TRANSACTION_MANAGER,
  I_DB2_MIGRATION_SERVICE,
  I_DB2_CLIENT,
  I_DB2_SERVICE,
} from '../constants/injection-token.constant';
import { Db2ConfigModule } from './db2-config.module';
import { createAuthStrategy } from '../auth';

@Global()
@Module({})
export class Db2Module {
  static forRoot(options: IDb2ConfigOptions): DynamicModule {
    return this.createModule({
      configModule: Db2ConfigModule.forRoot(options),
      imports: [],
      additionalProviders: [],
    });
  }

  static forRootAsync(options: {
    imports?: any[];
    useFactory: (
      ...args: any[]
    ) => Promise<IDb2ConfigOptions> | IDb2ConfigOptions;
    inject?: any[];
  }): DynamicModule {
    return this.createModule({
      configModule: Db2ConfigModule.forRootAsync({
        useFactory: options.useFactory,
        inject: options.inject || [],
      }),
      imports: options.imports || [],
      additionalProviders: [
        {
          provide: I_DB2_CONFIG,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ],
    });
  }

  private static createModule(options: {
    configModule: DynamicModule;
    imports?: any[];
    additionalProviders?: any[];
  }): DynamicModule {
    return {
      module: Db2Module,
      imports: [
        ...(options.imports || []),
        options.configModule,
        CacheModule.registerAsync({
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
        Db2PoolManager,
        Db2ConnectionManager,
        Db2Client,
        TransactionManager,
        Db2MigrationService,
        Db2Service,
        {
          provide: 'DB2_AUTH_STRATEGY',
          useFactory: (
            config: IDb2ConfigOptions,
            connectionManager: IConnectionManager,
          ) => createAuthStrategy(config, connectionManager),
          inject: [I_DB2_CONFIG, I_CONNECTION_MANAGER],
        },
        // Map interface tokens to existing classes
        { provide: I_POOL_MANAGER, useExisting: Db2PoolManager },
        { provide: I_CONNECTION_MANAGER, useExisting: Db2ConnectionManager },
        { provide: I_DB2_CLIENT, useExisting: Db2Client },
        { provide: I_TRANSACTION_MANAGER, useExisting: TransactionManager },
        { provide: I_DB2_MIGRATION_SERVICE, useExisting: Db2MigrationService },
        { provide: I_DB2_SERVICE, useExisting: Db2Service },
        ...(options.additionalProviders || []),
      ],
      exports: [
        I_DB2_SERVICE,
        I_POOL_MANAGER,
        I_CONNECTION_MANAGER,
        I_DB2_CLIENT,
        I_TRANSACTION_MANAGER,
        I_DB2_MIGRATION_SERVICE,
        I_DB2_CONFIG,
      ],
    };
  }
}
