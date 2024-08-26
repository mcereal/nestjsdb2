// src/interfaces/db2.interface.ts

import { Db2ConnectionState } from "src/enums";

/**
 * Basic connection properties required for establishing a connection to a Db2 database.
 */
export interface Db2BasicConnectionOptions {
  host: string;
  port: number;
  database: string;
}

/**
 * Interface for authentication options.
 */
export interface Db2AuthOptions {
  authType: "password" | "kerberos" | "jwt" | "ldap";
  username?: string;
  password?: string;
  krbServiceName?: string;
  krb5Config?: string;
  krbKeytab?: string;
  jwtToken?: string;
  jwtSecret?: string;
}

/**
 * Interface for logging options.
 */
export interface Db2LoggingOptions {
  logQueries?: boolean;
  logErrors?: boolean;
  profileSql?: boolean;
  traceFilePath?: string;
  traceLevel?: "error" | "info" | "debug" | "trace";
}

/**
 * Interface for retry and failover options.
 */
export interface Db2RetryOptions {
  retryPolicy?: "none" | "simple" | "exponentialBackoff";
  retryAttempts?: number;
  retryInterval?: number;
  connectionRetries?: number;
  retryDelay?: number;
  failoverHost?: string;
  failoverPort?: number;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
}

/**
 * Interface for migration options.
 */
export interface Db2MigrationOptions {
  enabled: boolean;
  migrationDir: string;
  tableName?: string; // Made optional for flexibility
  fileExtension: string;
  runOnStart: boolean;
  logQueries: boolean;
  logErrors: boolean;
  dryRun: boolean;
  skipOnFail: boolean;
  ignoreMissing: boolean;
  ignoreExecuted: boolean;
  ignoreErrors: boolean;
  markAsExecuted: boolean;
}

/**
 * Interface for cache options.
 */
export interface Db2CacheOptions {
  enabled: boolean;
  store: "memory" | "redis";
  ttl?: number; // Time to live for cached items, in seconds
  max?: number; // Maximum number of items to cache
  redisHost?: string; // For Redis configuration
  redisPort?: number; // For Redis configuration
  redisPassword?: string; // For Redis configuration
  resetOnDestroy?: boolean; // Reset cache on service destroy
}

/**
 * Comprehensive configuration options for setting up a Db2 connection.
 */
export interface Db2ConfigOptions extends Db2BasicConnectionOptions {
  useTls?: boolean;
  sslCertificatePath?: string;

  auth?: Db2AuthOptions;
  logging?: Db2LoggingOptions;
  retry?: Db2RetryOptions;
  migration?: Db2MigrationOptions;
  cache?: Db2CacheOptions;

  connectionTimeout?: number;
  idleTimeout?: number;
  maxPoolSize?: number;
  minPoolSize?: number;
  acquireTimeoutMillis?: number;
  maxLifetime?: number;
  connectionTestQuery?: string;

  fetchSize?: number;
  queryTimeout?: number;
  autoCommit?: boolean;
  statementCacheSize?: number;
  prefetchSize?: number;

  characterEncoding?: string;
  securityMechanism?: string;
  currentSchema?: string;
  applicationName?: string;
  tcpKeepAlive?: boolean;
}

export interface Db2ClientInterface {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query<T>(sql: string, params?: any[], timeout?: number): Promise<T>;
  executePreparedStatement<T>(sql: string, params?: any[]): Promise<T>;
  beginTransaction(): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  checkHealth(): Promise<boolean>;
  getState(): Db2ConnectionState;
  getActiveConnectionsCount(): number;
  getTotalConnectionsCount(): number;
  drainPool(): Promise<void>;
  // Add any additional methods needed for client operations
}

export interface Db2ServiceInterface {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query<T>(sql: string, params?: any[], timeout?: number): Promise<T>;
  executePreparedStatement<T>(sql: string, params?: any[]): Promise<T>;
  beginTransaction(): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  checkHealth(): Promise<{ dbHealth: boolean; transactionActive: boolean }>;
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
  // Add any other high-level methods exposed by Db2Service
}

export interface TransactionManagerInterface {
  beginTransaction(isolationLevel?: string): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  setIsolationLevel(level: string): void;
  isTransactionActive(): boolean;
  retryOperation<T>(
    operation: () => Promise<T>,
    attempts?: number,
    delay?: number
  ): Promise<T>;
  withTimeout<T>(operation: () => Promise<T>, timeout: number): Promise<T>;
}
