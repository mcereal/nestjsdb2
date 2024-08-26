import { Db2QueryBuilder } from "../db";
import { Db2ConnectionState } from "../enums";

export interface Db2ServiceInterface {
  // Lifecycle hooks
  onModuleInit(): Promise<void>;
  onModuleDestroy(): Promise<void>;

  // Connection management methods
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  drainPool(): Promise<void>;

  // Connection state and health check methods
  getState(): Db2ConnectionState;
  getActiveConnectionsCount(): number;
  checkHealth(): Promise<{ dbHealth: boolean; transactionActive: boolean }>;

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

  // Transaction management methods
  beginTransaction(): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;

  // Migration-related method
  runMigration(script: string): Promise<void>;

  // Cache management methods
  clearCache(sql: string, params?: any[]): Promise<boolean>;

  // Query builder method
  createQueryBuilder(): Db2QueryBuilder;
}
