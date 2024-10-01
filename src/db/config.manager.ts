import { IDb2ConfigManager, IConfigOptions } from '../interfaces';

/**
 * ConfigManager class to manage the configuration options.
 * This class is responsible for applying default values to the provided configuration.
 * @implements IDb2ConfigManager
 * @class
 * @public
 * @property {() => IConfigOptions} _config - Configuration options.
 * @method {setDefaults} - Generic method to apply default values.
 * @method {applyDefaults} - Applies default values to the provided configuration if missing.
 * @method {config} - Get the fully merged configuration with defaults.
 * @constructor
 * @param {IConfigOptions} options - Configuration options.
 * @returns {ConfigManager} - ConfigManager instance.
 * @example
 * ```typescript
 * const config: IConfigOptions = {
 *  host: 'localhost',
 *  port: 50000,
 *  database: 'sample',
 *  auth: {
 *   authType: 'user',
 *   user: 'db
 *   password: 'password'
 *  }
 * };
 *
 * const configManager = new ConfigManager(config);
 * console.log(configManager.config);
 * ```
 */
export class ConfigManager implements IDb2ConfigManager {
  private _config: () => IConfigOptions;

  constructor(options: IConfigOptions) {
    this._config = () => this.applyDefaults(options);
  }

  /**
   * Generic method to apply default values.
   * @param {T} provided - Provided configuration.
   * @param {Partial<T>} defaults - Default configuration.
   * @returns {T} - Merged configuration.
   * @public
   * @method
   * @example
   * ```typescript
   * const defaults = {
   * maxReconnectAttempts: 3,
   * reconnectInterval: 5000,
   * retryPolicy: 'simple',
   * retryAttempts: 3,
   * retryInterval: 1000,
   * };
   * const provided = {
   * maxReconnectAttempts: 5,
   * reconnectInterval: 10000,
   * retryPolicy: 'simple',
   * retryAttempts: 5,
   * retryInterval: 2000,
   * };
   * const merged = setDefaults(provided, defaults);
   */
  setDefaults<T>(provided: T, defaults: Partial<T>): T {
    return { ...defaults, ...provided };
  }

  /**
   * Applies default values to the provided configuration if missing.
   * @param {IConfigOptions} config - Configuration options.
   * @returns {IConfigOptions} - Merged configuration.
   * @public
   * @method
   * @example
   * ```typescript
   * const config: IConfigOptions = {
   * host: 'localhost',
   * port: 50000,
   * database: 'sample',
   * auth: {
   *  authType: 'user',
   *  user: 'db
   *  password: 'password'
   *  }
   * };
   * const merged = applyDefaults(config);
   */
  private applyDefaults(config: IConfigOptions): IConfigOptions {
    return {
      ...config,
      retry: this.setDefaults(config.retry, {
        maxReconnectAttempts: 3,
        reconnectInterval: 5000,
        retryPolicy: 'simple',
        retryAttempts: 3,
        retryInterval: 1000,
      }),
      logging: this.setDefaults(config.logging, {
        logQueries: false,
        logErrors: true,
        profileSql: false,
      }),
      connectionTimeout: config.connectionTimeout ?? 30000, // Default to 30 seconds
      poolOptions: this.setDefaults(config.poolOptions, {
        maxPoolSize: 10,
        minPoolSize: 2,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        maxWaitingClients: 20,
      }),
      autoCommit: config.autoCommit ?? true, // Default to auto-commit
      fetchSize: config.fetchSize ?? 100, // Default to 100 rows
      queryTimeout: config.queryTimeout ?? 15000, // Default to 15 seconds
      prefetchSize: config.prefetchSize ?? 10, // Default to 10 rows
      characterEncoding: config.characterEncoding ?? 'UTF-8', // Default to UTF-8
    };
  }

  /**
   * Get the fully merged configuration with defaults.
   * @returns {IConfigOptions} - Merged configuration.
   * @public
   * @method
   * @example
   * ```typescript
   * const config = configManager.config;
   */
  get config(): IConfigOptions {
    return this._config();
  }

  /**
   * Static method to create a ConfigManager instance asynchronously.
   * @param {Object} options - Options to create the ConfigManager instance.
   * @param {() => Promise<IConfigOptions> | IConfigOptions} options.useFactory - Factory function to create the configuration options.
   * @param {any[]} options.inject - Optional dependencies to inject into the factory function.
   * @returns {Promise<ConfigManager>} - A Promise that resolves with a ConfigManager instance.
   * @public
   * @static
   * @async
   * @method
   * @example
   * ```typescript
   * const configManager = await ConfigManager.forRootAsync({
   *    useFactory: async () => {
   *      return {
   *        host: 'localhost',
   *        port: 50000,
   *        database: 'sample',
   *        auth: {
   *          authType: 'user',
   *          user: 'db
   *          password: 'password'
   *        }
   *      };
   *    },
   * });
   * ```
   */
  public static async forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<IConfigOptions> | IConfigOptions;
    inject?: any[];
  }): Promise<ConfigManager> {
    const configOptions = await options.useFactory();
    return new ConfigManager(configOptions);
  }
}
