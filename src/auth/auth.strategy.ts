import { IConnectionManager, IConfigOptions } from '../interfaces';

export abstract class AuthStrategy {
  protected config: IConfigOptions;
  protected connectionManager: IConnectionManager;

  constructor(config: IConfigOptions, connectionManager: IConnectionManager) {
    this.config = config;
    this.connectionManager = connectionManager;
  }

  abstract authenticate(): Promise<void>;
  abstract getConnectionString(): string;
}
