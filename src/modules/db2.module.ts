// src/modules/db2.module.ts

import { Module, DynamicModule, Provider } from "@nestjs/common";
import { Db2Service } from "../services/db2.service";
import { Db2ConfigOptions, Db2CacheOptions } from "../interfaces/db2.interface";
import { Db2MigrationService } from "src/services/migration.service";
import {
  CACHE_MANAGER,
  CacheModule,
  CacheModuleOptions,
} from "@nestjs/cache-manager";
import { redisStore } from "cache-manager-redis-yet";

@Module({})
export class Db2Module {
  static forRoot(options: Db2ConfigOptions): DynamicModule {
    const db2ServiceProvider: Provider = {
      provide: Db2Service,
      useFactory: (cacheManager) =>
        new Db2Service({ ...options, cache: cacheManager }),
      inject: [CACHE_MANAGER],
    };

    const db2MigrationProvider: Provider = {
      provide: Db2MigrationService,
      useFactory: (db2Service: Db2Service) =>
        new Db2MigrationService(db2Service, options.migration),
      inject: [Db2Service],
    };

    const cacheModule = this.createCacheModule(options.cache);

    return {
      module: Db2Module,
      imports: [cacheModule],
      providers: [db2ServiceProvider, db2MigrationProvider],
      exports: [Db2Service, Db2MigrationService],
    };
  }

  static forRootAsync(options: {
    useFactory: (
      ...args: any[]
    ) => Promise<Db2ConfigOptions> | Db2ConfigOptions;
    inject?: any[];
  }): DynamicModule {
    const db2ServiceProvider: Provider = {
      provide: Db2Service,
      useFactory: async (cacheManager, ...args: any[]) => {
        const db2Config = await options.useFactory(...args); // Await to handle both Promise and direct return
        return new Db2Service({ ...db2Config, cache: cacheManager });
      },
      inject: [CACHE_MANAGER, ...(options.inject || [])],
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
      providers: [db2ServiceProvider, cacheModuleProvider],
      exports: [Db2Service],
    };
  }

  static forFeature(): DynamicModule {
    return {
      module: Db2Module,
      providers: [Db2Service],
      exports: [Db2Service],
    };
  }

  private static createCacheModule(
    cacheOptions?: Db2CacheOptions
  ): DynamicModule {
    if (cacheOptions && cacheOptions.enabled) {
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

    // If caching is not enabled, return an empty module
    return CacheModule.register();
  }
}
