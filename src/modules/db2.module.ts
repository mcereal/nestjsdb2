// src/db2.module.ts
import { Module, DynamicModule, Global, Provider } from '@nestjs/common';
import { Db2Service } from '../services/db2.service';
import { Db2Client } from '../db/db2-client';
import { TransactionManager } from '../db/transaction-manager';
import { Db2MigrationService } from '../services/migration.service';
import { Db2PoolManager } from '../db/db2-pool.manager';
import { Db2ConnectionManager } from '../db/db2-connection.manger';
import { IDb2ConfigOptions, IConnectionManager } from '../interfaces';
import { CacheModule, CacheModuleOptions } from '@nestjs/cache-manager';
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
import { EntityMetadataStorage } from '../metadata/entity-metadata.storage';
import { ClassConstructor } from '../types';
import { Schema } from '../orm/schema';
import { Model } from '../orm/model';
import { ModelRegistry } from '../orm/model-registry';

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

  static forFeature(entities: Function[]): DynamicModule {
    const modelProviders: Provider[] = entities.map((entity) =>
      this.createModelProvider(entity as ClassConstructor),
    );

    return {
      module: Db2Module,
      providers: modelProviders,
      exports: modelProviders,
    };
  }

  static forFeatureAsync(options: {
    entities: Function[];
    imports?: any[];
    useFactory?: (
      ...args: any[]
    ) => Promise<IDb2ConfigOptions> | IDb2ConfigOptions;
    inject?: any[];
  }): DynamicModule {
    const modelProviders: Provider[] = options.entities.map((entity) =>
      this.createModelProvider(entity as ClassConstructor),
    );

    return {
      module: Db2Module,
      imports: [...(options.imports || [])],
      providers: [...modelProviders],
      exports: [...modelProviders],
    };
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

  private static createModelProvider(entity: ClassConstructor): Provider {
    const metadata = EntityMetadataStorage.getEntityMetadata(entity);
    if (!metadata || metadata.entityType !== 'table') {
      throw new Error(`Entity ${entity.name} is not a valid table entity.`);
    }
    const schema = new Schema(entity);

    return {
      provide: `${entity.name}Model`,
      useFactory: (db2Service: Db2Service, modelRegistry: ModelRegistry) => {
        const model = new Model(db2Service, schema, modelRegistry);
        modelRegistry.registerModel(`${entity.name}Model`, model);
        return model;
      },
      inject: [I_DB2_SERVICE, ModelRegistry],
    };
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
              const cacheOptions: CacheModuleOptions = {
                store: config.cache.store,
                ttl: config.cache.ttl || 600, // Default TTL
              };

              if (config.cache.store === 'redis') {
                cacheOptions.url = `redis://${config.cache.redisHost}:${config.cache.redisPort}`;
                if (config.cache.redisPassword) {
                  cacheOptions.password = config.cache.redisPassword;
                }
              } else if (config.cache.store === 'memory') {
                cacheOptions.max = config.cache.max || 100;
              }

              return cacheOptions;
            }
            return {}; // Default cache configuration if caching is disabled
          },
        }),
      ],
      providers: [
        ModelRegistry, // Register ModelRegistry as a provider
        Db2PoolManager,
        Db2ConnectionManager,
        Db2Client,
        TransactionManager,
        Db2MigrationService,
        {
          provide: I_DB2_SERVICE,
          useClass: Db2Service,
        },
        {
          provide: 'DB2_AUTH_STRATEGY',
          useFactory: (
            config: IDb2ConfigOptions,
            connectionManager: IConnectionManager,
          ) => createAuthStrategy(config, connectionManager),
          inject: [I_DB2_CONFIG, I_CONNECTION_MANAGER],
        },
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
        ModelRegistry, // Export ModelRegistry if external access is needed
      ],
    };
  }
}
