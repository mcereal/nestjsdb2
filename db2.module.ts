/**
 * @fileoverview This file contains the implementation of the Db2Module for NestJS applications.
 * The Db2Module provides methods to configure and manage the Db2Service, which handles database operations
 * with a Db2 database. The module can be configured synchronously with predefined options or asynchronously
 * using a factory function. It also provides a feature module for injecting the Db2Service into other modules.
 *
 * @class Db2Module
 *
 * @requires Module from "@nestjs/common"
 * @requires DynamicModule from "@nestjs/common"
 * @requires Provider from "@nestjs/common"
 * @requires Db2Service from "./src/services/db2.service"
 * @requires Db2ConfigOptions from "./src/interfaces/db2.interface"
 *
 * @exports Db2Module
 */

import { Module, DynamicModule, Provider } from "@nestjs/common";
import { Db2Service } from "./src/services/db2.service";
import { Db2ConfigOptions } from "./src/interfaces/db2.interface";

@Module({})
export class Db2Module {
  /**
   * @method forRoot
   * @description Registers the Db2Module with synchronous configuration options.
   * This method is typically used when the configuration options are known and can be
   * provided at the time of module import. It provides the Db2Service configured with the specified options.
   *
   * @param {Db2ConfigOptions} options - The configuration options for the Db2Service.
   * @returns {DynamicModule} - A dynamic module that includes the Db2Service provider configured with the given options.
   *
   * @example
   * // Example of using forRoot to configure Db2Module with static options
   * import { Db2Module } from './db2.module';
   *
   * @Module({
   *   imports: [
   *     Db2Module.forRoot({
   *       host: 'localhost',
   *       port: 50000,
   *       username: 'db2user',
   *       password: 'password',
   *       database: 'sampledb'
   *     })
   *   ]
   * })
   * export class AppModule {}
   */
  static forRoot(options: Db2ConfigOptions): DynamicModule {
    const db2ServiceProvider: Provider = {
      provide: Db2Service,
      useFactory: () => new Db2Service(options),
    };

    return {
      module: Db2Module,
      providers: [db2ServiceProvider],
      exports: [Db2Service],
    };
  }

  /**
   * @method forRootAsync
   * @description Registers the Db2Module with asynchronous configuration options.
   * This method is typically used when configuration options need to be computed dynamically
   * or are dependent on asynchronous operations (e.g., fetching from a remote service or environment variables).
   *
   * @param {Object} options - An object containing a useFactory function to provide the configuration options asynchronously.
   * @param {Function} options.useFactory - A factory function that returns or resolves to Db2ConfigOptions.
   * @param {Array} [options.inject] - Optional dependencies to inject into the factory function.
   * @returns {DynamicModule} - A dynamic module that includes the Db2Service provider configured with the options returned by the factory function.
   *
   * @example
   * // Example of using forRootAsync to configure Db2Module with dynamic options
   * import { Db2Module } from './db2.module';
   *
   * @Module({
   *   imports: [
   *     Db2Module.forRootAsync({
   *       useFactory: async (configService: ConfigService) => ({
   *         host: configService.get('DB_HOST'),
   *         port: configService.get('DB_PORT'),
   *         username: configService.get('DB_USER'),
   *         password: configService.get('DB_PASS'),
   *         database: configService.get('DB_NAME'),
   *       }),
   *       inject: [ConfigService]
   *     })
   *   ]
   * })
   * export class AppModule {}
   */
  static forRootAsync(options: {
    useFactory: (
      ...args: any[]
    ) => Promise<Db2ConfigOptions> | Db2ConfigOptions;
    inject?: any[];
  }): DynamicModule {
    const db2ServiceProvider: Provider = {
      provide: Db2Service,
      useFactory: async (...args: any[]) => {
        const db2Config = await options.useFactory(...args);
        return new Db2Service(db2Config);
      },
      inject: options.inject || [],
    };

    return {
      module: Db2Module,
      providers: [db2ServiceProvider],
      exports: [Db2Service],
    };
  }

  /**
   * @method forFeature
   * @description Provides the Db2Service as a feature module. This method can be used
   * to import the Db2Service into specific modules without reconfiguring it. It allows
   * for the injection of the already configured Db2Service into feature modules.
   *
   * @returns {DynamicModule} - A dynamic module that includes the Db2Service provider.
   *
   * @example
   * // Example of using forFeature to provide Db2Service to a feature module
   * import { Db2Module } from './db2.module';
   *
   * @Module({
   *   imports: [
   *     Db2Module.forFeature(),
   *   ],
   *   providers: [SomeServiceThatUsesDb2Service],
   * })
   * export class FeatureModule {}
   */
  static forFeature(): DynamicModule {
    return {
      module: Db2Module,
      providers: [Db2Service],
      exports: [Db2Service],
    };
  }
}
