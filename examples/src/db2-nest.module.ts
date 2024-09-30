// src/db2-nest.module.ts

import { Module, DynamicModule, Provider, Global } from '@nestjs/common';
import { Db2Module, IDb2ConfigOptions } from '@mcereal/nestjsdb2';
import { Schema } from '@mcereal/nestjsdb2';

@Global() // Makes the module global
@Module({})
export class Db2NestModule {
  /**
   * Initializes the Db2NestModule instance asynchronously.
   * @param options An object containing the asynchronous configuration options.
   * @returns A dynamic module for NestJS.
   */
  static forRootAsync(options: {
    imports?: any[]; // Modules required by the factory
    useFactory: (
      ...args: any[]
    ) => Promise<IDb2ConfigOptions> | IDb2ConfigOptions;
    inject?: any[]; // Providers to inject into the factory
  }): DynamicModule {
    const db2ModuleProvider: Provider = {
      provide: 'DB2_MODULE',
      useFactory: async (...args: any[]) => {
        const config = await options.useFactory(...args);
        return await Db2Module.forRootAsync(() => config);
      },
      inject: options.inject || [],
    };

    return {
      module: Db2NestModule,
      imports: options.imports || [],
      providers: [db2ModuleProvider],
      exports: ['DB2_MODULE'],
    };
  }

  /**
   * Registers entity models and views.
   * @param entities Array of entity and view classes to register.
   * @returns A dynamic module for NestJS.
   */
  static forFeature(schema: Schema<any>): DynamicModule {
    const db2FeatureProvider: Provider = {
      provide: 'DB2_FEATURE',
      useFactory: async (db2Module: Db2Module) => {
        await Db2Module.forFeature(schema.getEntities());
        return db2Module;
      },
      inject: ['DB2_MODULE'],
    };

    return {
      module: Db2NestModule,
      providers: [db2FeatureProvider],
      exports: [db2FeatureProvider],
    };
  }
}
