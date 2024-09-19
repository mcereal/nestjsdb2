import { Db2ConnectionState } from "src/enums";
import { Db2ConfigOptions } from "src/interfaces";

export interface IConnectionManager {
  setState(state: Db2ConnectionState): void;
  getConnectionFromPool(connectionString: string): Promise<void>;
  buildConnectionString(config: Db2ConfigOptions): string;
  drainPool(): Promise<void>;
}
