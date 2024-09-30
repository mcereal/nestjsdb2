import { Module, DynamicModule, Provider } from '@nestjs/common';
import { Db2Module, IDb2ConfigOptions } from '@mcereal/nestjsdb2';

@Module({})
export class Db2NestModule {
  /**
   * Initializes the Db2NestModule instance asynchronously.
   * @param configFactory A factory function to provide configuration options.
   * @returns A dynamic module for NestJS.
   */
  static async forRootAsync(
    configFactory: () => Promise<IDb2ConfigOptions> | IDb2ConfigOptions,
  ): Promise<DynamicModule> {
    // Initialize the standalone Db2Module instance asynchronously
    const db2ModuleInstance = await Db2Module.forRootAsync(configFactory);

    const db2ModuleProvider: Provider = {
      provide: 'DB2_MODULE',
      useValue: db2ModuleInstance,
    };

    return {
      module: Db2NestModule,
      providers: [db2ModuleProvider],
      exports: [db2ModuleProvider],
    };
  }

  /**
   * Registers entity models.
   * @param entities Array of entity classes to register.
   * @returns A dynamic module for NestJS.
   */
  static forFeature(entities: any[]): DynamicModule {
    // Register entities with the standalone Db2Module
    Db2Module.forFeature(entities);

    return {
      module: Db2NestModule,
    };
  }
}
