import { Db2ConnectionState } from '../enums';
import { Connection } from 'ibm_db';

export interface IDb2Client {
  // Lifecycle hooks
  onModuleInit(): void;
  onModuleDestroy(): void;

  // Connection management methods

  closeConnection(connection: Connection): Promise<void>;

  // Connection pooling methods
  drainPool(): Promise<void>;

  // Transaction management methods
  beginTransaction(): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;

  // Query execution methods
  query<T>(
    sql: string,
    params?: Record<string, any>,
    timeout?: number,
  ): Promise<T>;
  executePreparedStatement<T>(sql: string, params?: any[]): Promise<T>;
  batchInsert(
    tableName: string,
    columns: string[],
    valuesArray: any[][],
  ): Promise<void>;
  batchUpdate(
    tableName: string,
    columns: string[],
    valuesArray: any[][],
    whereClause: string,
  ): Promise<void>;

  // Pool monitoring
  logPoolStatus(): void;

  // Health check
  checkHealth(): Promise<{
    status: boolean;
    details?: any;
  }>;

  // Connection pool status
  getActiveConnectionsCount(): number;
}

export interface Db2ClientState {
  connectionState: Db2ConnectionState;
  activeConnections: number;
  totalConnections: number;
  reconnectionAttempts: number;
  recentErrors: string[];
  lastUsed: string;
  poolInitialized: boolean;
}

export interface Db2HealthDetails {
  poolStats: Db2PoolStats;
  connectionStats: Db2ConnectionStats;
  connectionDetails?: Db2ConnectionDetails; // Optional because it may not always be available
}

// Define poolStats structure
export interface Db2PoolStats {
  activeConnections: number;
  totalConnections: number;
  minPoolSize: number;
  maxPoolSize: number;
}

// Define connectionStats structure
export interface Db2ConnectionStats {
  appName: string;
  connectionCount: number;
}

// Define connectionDetails structure
export interface Db2ConnectionDetails {
  agentId: string;
  applicationConnectionTime: string;
  applicationIdleTime: string;
  locksHeld: number;
  agentSystemCpuTimeMs: number;
  agentUserCpuTimeMs: number;
  directReads: number;
  directWrites: number;
  commitSqlStatements: number;
  rollbackSqlStatements: number;
  failedSqlStatements: number;
}
