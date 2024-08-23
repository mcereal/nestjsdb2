// src/interfaces/db2.interface.ts

/**
 * Basic connection properties shared between configuration options.
 */
export interface Db2BasicConnectionOptions {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

/**
 * Interface for the Db2ConfigOptions class.
 */
export interface Db2ConfigOptions extends Db2BasicConnectionOptions {
  // Security options
  useTls?: boolean;
  sslCertificatePath?: string;
  authType?: "db2-user" | "kerberos" | "jwt";
  jwtTokenPath?: string;
  kerberosServiceName?: string;
  validateServerCertificate?: boolean;

  // Connection pooling options
  connectionTimeout?: number;
  idleTimeout?: number;
  maxPoolSize?: number;
  minPoolSize?: number;
  acquireTimeoutMillis?: number;
  maxLifetime?: number;
  connectionTestQuery?: string;

  // Performance and tuning options
  fetchSize?: number;
  queryTimeout?: number;
  autoCommit?: boolean;
  statementCacheSize?: number;
  prefetchSize?: number;
  clientInfo?: string;

  // Load balancing and failover
  enableLoadBalancing?: boolean;
  readReplicaHosts?: string[];
  primaryHost?: string;
  failoverTimeout?: number;

  // Caching options
  cacheEnabled?: boolean;
  cacheTtl?: number;

  // Logging options
  logQueries?: boolean;
  logErrors?: boolean;
  profileSql?: boolean;
  traceFilePath?: string;
  traceLevel?: "error" | "info" | "debug" | "trace";

  // Socket options
  socketOptions?: {
    keepAlive?: boolean;
    keepAliveInitialDelay?: number;
    noDelay?: boolean;
  };

  // Locale and encoding
  clientLocale?: string;
  characterEncoding?: string;

  // Error handling and retries
  retryPolicy?: "none" | "simple" | "exponentialBackoff";
  retryAttempts?: number;
  retryInterval?: number;
}

/**
 * Interface for the Db2ConnectionOptions class.
 */
export interface Db2ConnectionOptions extends Db2BasicConnectionOptions {
  connectionTimeout?: number;
  idleTimeout?: number;
  maxPoolSize?: number;
  minPoolSize?: number;
}

/**
 * Interface for the Db2Connection class.
 */
export interface Db2ConnectionInterface {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query<T>(sql: string, params?: any[], timeout?: number): Promise<T>;
  executePreparedStatement<T>(sql: string, params?: any[]): Promise<T>;
  beginTransaction(): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  checkHealth(): Promise<boolean>;
  getActiveConnectionsCount(): number;
  drainPool(): Promise<void>;
}
