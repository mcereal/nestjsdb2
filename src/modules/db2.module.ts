import { Module, DynamicModule, Provider } from "@nestjs/common";
import { Db2Service } from "../services/db2.service";
import { Db2Client } from "../db/db2-client";
import { TransactionManager } from "../db/transaction-manager";
import { Db2MigrationService } from "../services/migration.service";
import { Db2ConfigOptions } from "../interfaces/db2.interface";
import {
  CACHE_MANAGER,
  CacheModule,
  CacheModuleOptions,
} from "@nestjs/cache-manager";
import { redisStore } from "cache-manager-redis-yet";

@Module({})
export class Db2Module {
  static forRoot(options: Db2ConfigOptions): DynamicModule {
    const db2ClientProvider: Provider = {
      provide: Db2Client,
      useFactory: () => new Db2Client(options),
    };

    const transactionManagerProvider: Provider = {
      provide: TransactionManager,
      useFactory: (db2Client: Db2Client) => new TransactionManager(db2Client),
      inject: [Db2Client],
    };

    const db2MigrationServiceProvider: Provider = {
      provide: Db2MigrationService,
      useFactory: (db2Client: Db2Client) =>
        new Db2MigrationService(db2Client, options.migration),
      inject: [Db2Client],
    };

    const db2ServiceProvider: Provider = {
      provide: Db2Service,
      useFactory: (
        cacheManager,
        transactionManager: TransactionManager,
        migrationService: Db2MigrationService
      ) =>
        new Db2Service(
          options,
          cacheManager,
          transactionManager,
          migrationService
        ),
      inject: [CACHE_MANAGER, TransactionManager, Db2MigrationService],
    };

    const cacheModule = this.createCacheModule(options.cache);

    return {
      module: Db2Module,
      imports: [cacheModule],
      providers: [
        db2ClientProvider,
        transactionManagerProvider,
        db2MigrationServiceProvider,
        db2ServiceProvider,
      ],
      exports: [Db2Service],
    };
  }

  static forRootAsync(options: {
    useFactory: (
      ...args: any[]
    ) => Promise<Db2ConfigOptions> | Db2ConfigOptions;
    inject?: any[];
  }): DynamicModule {
    const db2ClientProvider: Provider = {
      provide: Db2Client,
      useFactory: async (...args: any[]) => {
        const db2Config = await options.useFactory(...args);
        return new Db2Client(db2Config);
      },
      inject: options.inject || [],
    };

    const transactionManagerProvider: Provider = {
      provide: TransactionManager,
      useFactory: (db2Client: Db2Client) => new TransactionManager(db2Client),
      inject: [Db2Client],
    };

    const db2MigrationServiceProvider: Provider = {
      provide: Db2MigrationService,
      useFactory: async (db2Client: Db2Client, ...args: any[]) => {
        const db2Config = await options.useFactory(...args);
        return new Db2MigrationService(db2Client, db2Config.migration);
      },
      inject: [Db2Client, ...(options.inject || [])],
    };

    const db2ServiceProvider: Provider = {
      provide: Db2Service,
      useFactory: async (...args: any[]) => {
        const db2Config = await options.useFactory(...args);
        const cacheManager = db2Config.cache?.enabled
          ? args.shift()
          : undefined;
        const transactionManager = args.shift() as TransactionManager;
        const migrationService = args.shift() as Db2MigrationService;

        return new Db2Service(
          db2Config,
          cacheManager,
          transactionManager,
          migrationService
        );
      },
      inject: [
        CACHE_MANAGER,
        TransactionManager,
        Db2MigrationService,
        ...(options.inject || []),
      ],
    };

    const cacheModuleProvider: Provider = {
      provide: CacheModule,
      useFactory: async (...args: any[]) => {
        const db2Config = await options.useFactory(...args);
        return this.createCacheModule(db2Config.cache);
      },
      inject: options.inject || [],
    };

    return {
      module: Db2Module,
      imports: [CacheModule],
      providers: [
        db2ClientProvider,
        transactionManagerProvider,
        db2MigrationServiceProvider,
        db2ServiceProvider,
        cacheModuleProvider,
      ],
      exports: [Db2Service],
    };
  }

  private static createCacheModule(
    cacheOptions?: Db2ConfigOptions["cache"]
  ): DynamicModule {
    if (cacheOptions?.enabled) {
      const cacheConfig: CacheModuleOptions = {
        store: cacheOptions.store === "redis" ? redisStore : "memory",
        ...(cacheOptions.store === "redis" && {
          socket: {
            host: cacheOptions.redisHost,
            port: cacheOptions.redisPort,
          },
          password: cacheOptions.redisPassword,
          ttl: cacheOptions.ttl || 600, // Default TTL
        }),
        ...(cacheOptions.store === "memory" && {
          max: cacheOptions.max || 100,
          ttl: cacheOptions.ttl || 600,
        }),
      };

      return CacheModule.register(cacheConfig);
    }

    return CacheModule.register();
  }
}
