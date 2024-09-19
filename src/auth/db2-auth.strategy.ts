import { IConnectionManager } from "../interfaces";
import { Db2ConfigOptions } from "src/interfaces";

export abstract class Db2AuthStrategy {
  protected config: Db2ConfigOptions;
  protected connectionManager: IConnectionManager;

  constructor(config: Db2ConfigOptions, connectionManager: IConnectionManager) {
    this.config = config;
    this.connectionManager = connectionManager;
  }

  abstract authenticate(): Promise<void>;
}
