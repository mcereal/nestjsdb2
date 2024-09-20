import { IConnectionManager, IDb2ConfigOptions } from '../interfaces';

export abstract class Db2AuthStrategy {
  protected config: IDb2ConfigOptions;
  protected connectionManager: IConnectionManager;

  constructor(
    config: IDb2ConfigOptions,
    connectionManager: IConnectionManager,
  ) {
    this.config = config;
    this.connectionManager = connectionManager;
  }

  abstract authenticate(): Promise<void>;
}
