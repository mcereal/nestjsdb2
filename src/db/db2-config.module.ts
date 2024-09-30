// src/db2-config.ts

import {
  IDb2ConfigManager,
  IDb2ConfigOptions,
  Db2RetryOptions,
  Db2LoggingOptions,
} from '../interfaces';

export class Db2Config implements IDb2ConfigManager {
  private _config: () => IDb2ConfigOptions;

  constructor(options: IDb2ConfigOptions) {
    this._config = () => this.applyDefaults(options);
  }

  /**
   * Get the fully merged configuration with defaults.
   */
  get config(): IDb2ConfigOptions {
    return this._config();
  }

  /**
   * Applies default values to the provided configuration if missing.
   */
  private applyDefaults(config: IDb2ConfigOptions): IDb2ConfigOptions {
    return {
      ...config,
      retry: this.applyRetryDefaults(config.retry),
      logging: this.applyLoggingDefaults(config.logging),
      connectionTimeout: config.connectionTimeout ?? 30000, // Default to 30 seconds
      minPoolSize: config.minPoolSize ?? 1, // Default to 1 connection
      maxPoolSize: config.maxPoolSize ?? 10, // Default to 10 connections
      idleTimeout: config.idleTimeout ?? 60000, // Default to 1 minute
      maxLifetime: config.maxLifetime ?? 1800000, // Default to 30 minutes
      autoCommit: config.autoCommit ?? true, // Default to auto-commit
      fetchSize: config.fetchSize ?? 100, // Default to 100 rows
      queryTimeout: config.queryTimeout ?? 15000, // Default to 15 seconds
      prefetchSize: config.prefetchSize ?? 10, // Default to 10 rows
      characterEncoding: config.characterEncoding ?? 'UTF-8', // Default to UTF-8
    };
  }

  /**
   * Applies default values to the retry options if missing.
   */
  private applyRetryDefaults(retry: Db2RetryOptions = {}): Db2RetryOptions {
    return {
      maxReconnectAttempts: retry.maxReconnectAttempts ?? 3, // Default to 3 attempts
      reconnectInterval: retry.reconnectInterval ?? 5000, // Default to 5 seconds
      retryPolicy: retry.retryPolicy ?? 'simple',
      retryAttempts: retry.retryAttempts ?? 3,
      retryInterval: retry.retryInterval ?? 1000, // Default retry interval
    };
  }

  /**
   * Applies default values to the logging options if missing.
   */
  private applyLoggingDefaults(
    logging: Db2LoggingOptions = {},
  ): Db2LoggingOptions {
    return {
      logQueries: logging.logQueries ?? false, // Default to false
      logErrors: logging.logErrors ?? true, // Default to true
      profileSql: logging.profileSql ?? false, // Default to false
    };
  }

  /**
   * Static method to create a Db2Config instance asynchronously.
   */
  public static async forRootAsync(options: {
    useFactory: (
      ...args: any[]
    ) => Promise<IDb2ConfigOptions> | IDb2ConfigOptions;
    inject?: any[];
  }): Promise<Db2Config> {
    const configOptions = await options.useFactory();
    return new Db2Config(configOptions);
  }
}
