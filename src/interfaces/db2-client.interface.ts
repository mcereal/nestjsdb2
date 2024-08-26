import { Db2ConnectionState } from "../enums";
import { Connection } from "ibm_db";
import { Db2ConfigOptions } from "./";

export interface Db2ClientInterface {
  // Lifecycle hooks
  onModuleInit(): void;
  onModuleDestroy(): void;

  // Connection management methods
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // Connection pooling methods
  releaseConnection(connection: Connection): Promise<void>;
  drainPool(): Promise<void>;

  // Transaction management methods
  beginTransaction(): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;

  // Query execution methods
  query<T>(sql: string, params?: any[], timeout?: number): Promise<T>;
  executePreparedStatement<T>(sql: string, params?: any[]): Promise<T>;
  batchInsert(
    tableName: string,
    columns: string[],
    valuesArray: any[][]
  ): Promise<void>;
  batchUpdate(
    tableName: string,
    columns: string[],
    valuesArray: any[][],
    whereClause: string
  ): Promise<void>;

  // Connection state management
  setState(state: Db2ConnectionState): void;
  getState(): Db2ConnectionState;

  // Configuration methods
  getConfig(): Db2ConfigOptions;
  getHost(): string;
  getDatabase(): string;
  buildConnectionString(config: Db2ConfigOptions): string;

  // Pool size management
  setPoolSize(minPoolSize: number, maxPoolSize: number): void;
  adjustPoolSizeBasedOnLoad(
    activeConnectionsThreshold: number,
    minPoolSize: number,
    maxPoolSize: number
  ): Promise<void>;

  // Pool monitoring
  logPoolStatus(): void;

  // Health check
  checkHealth(): Promise<boolean>;

  // Connection pool status
  getActiveConnectionsCount(): number;
  getTotalConnectionsCount(): number;
}
