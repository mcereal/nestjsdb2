import { IDb2ConfigManager, IConfigOptions } from '../interfaces';

export class ConfigManager implements IDb2ConfigManager {
  private _config: () => IConfigOptions;

  constructor(options: IConfigOptions) {
    this._config = () => this.applyDefaults(options);
  }

  /**
   * Generic method to apply default values.
   */
  setDefaults<T>(provided: T, defaults: Partial<T>): T {
    return { ...defaults, ...provided };
  }

  /**
   * Applies default values to the provided configuration if missing.
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
   */
  get config(): IConfigOptions {
    return this._config();
  }

  /**
   * Static method to create a ConfigManager instance asynchronously.
   */
  public static async forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<IConfigOptions> | IConfigOptions;
    inject?: any[];
  }): Promise<ConfigManager> {
    const configOptions = await options.useFactory();
    return new ConfigManager(configOptions);
  }
}
