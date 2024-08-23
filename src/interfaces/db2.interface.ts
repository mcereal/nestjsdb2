/**
 * @fileoverview This file contains the definitions of interfaces used for configuring and managing
 * Db2 database connections. The interfaces define the structure for configuration options,
 * connection options, and methods required for implementing Db2 database operations. These
 * interfaces provide a standardized way to define and use Db2 connection settings, ensuring
 * consistent implementation across the application.
 *
 * @interface Db2BasicConnectionOptions
 * @interface Db2ConfigOptions
 * @interface Db2ConnectionOptions
 * @interface Db2ConnectionInterface
 *
 * @exports Db2BasicConnectionOptions
 * @exports Db2ConfigOptions
 * @exports Db2ConnectionOptions
 * @exports Db2ConnectionInterface
 */

/**
 * @interface Db2BasicConnectionOptions
 * @description Basic connection properties required for establishing a connection to a Db2 database.
 * These options are shared across different configuration types and are essential for connecting to the database.
 *
 * @property {string} host - The hostname or IP address of the Db2 database server.
 * @property {number} port - The port number on which the Db2 database server is listening.
 * @property {string} username - The username used for authenticating with the Db2 database.
 * @property {string} password - The password associated with the username for Db2 authentication.
 * @property {string} database - The name of the Db2 database to connect to.
 */
export interface Db2BasicConnectionOptions {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

/**
 * @interface Db2ConfigOptions
 * @description Comprehensive configuration options for setting up a Db2 connection.
 * This interface extends Db2BasicConnectionOptions and includes additional settings for
 * security, performance, load balancing, logging, caching, and error handling.
 *
 * @extends Db2BasicConnectionOptions
 *
 * @property {boolean} [useTls] - Enables TLS for secure connections.
 * @property {string} [sslCertificatePath] - Path to the SSL certificate for secure connections.
 * @property {"db2-user" | "kerberos" | "jwt"} [authType] - Specifies the authentication type.
 * @property {string} [jwtTokenPath] - Path to the JWT token file for JWT authentication.
 * @property {string} [kerberosServiceName] - Kerberos service name for Kerberos authentication.
 * @property {boolean} [validateServerCertificate] - Validates the server certificate in TLS connections.
 *
 * @property {number} [connectionTimeout] - Timeout in milliseconds for establishing a connection.
 * @property {number} [idleTimeout] - Timeout in milliseconds for idle connections in the pool.
 * @property {number} [maxPoolSize] - Maximum number of connections in the connection pool.
 * @property {number} [minPoolSize] - Minimum number of connections in the connection pool.
 * @property {number} [acquireTimeoutMillis] - Timeout in milliseconds for acquiring a connection from the pool.
 * @property {number} [maxLifetime] - Maximum lifetime in milliseconds for a connection in the pool.
 * @property {string} [connectionTestQuery] - SQL query used to test the health of a connection.
 *
 * @property {number} [fetchSize] - Number of rows to fetch per database round trip.
 * @property {number} [queryTimeout] - Timeout in milliseconds for executing a query.
 * @property {boolean} [autoCommit] - Automatically commits transactions after each query execution.
 * @property {number} [statementCacheSize] - Number of prepared statements to cache.
 * @property {number} [prefetchSize] - Number of rows to prefetch during query execution.
 * @property {string} [clientInfo] - Custom client information to send with the connection.
 *
 * @property {boolean} [enableLoadBalancing] - Enables load balancing across multiple Db2 servers.
 * @property {string[]} [readReplicaHosts] - List of hostnames or IPs for read replicas.
 * @property {string} [primaryHost] - The primary host for the Db2 database connection.
 * @property {number} [failoverTimeout] - Timeout in milliseconds for failing over to a replica.
 *
 * @property {boolean} [cacheEnabled] - Enables caching of query results.
 * @property {number} [cacheTtl] - Time-to-live for cache entries in seconds.
 *
 * @property {boolean} [logQueries] - Enables logging of executed queries.
 * @property {boolean} [logErrors] - Enables logging of errors encountered during execution.
 * @property {boolean} [profileSql] - Enables SQL profiling for performance analysis.
 * @property {string} [traceFilePath] - File path for saving trace logs.
 * @property {"error" | "info" | "debug" | "trace"} [traceLevel] - Log level for tracing.
 *
 * @property {Object} [socketOptions] - Options for configuring socket behavior.
 * @property {boolean} [socketOptions.keepAlive] - Enables TCP keep-alive packets.
 * @property {number} [socketOptions.keepAliveInitialDelay] - Delay in milliseconds before sending keep-alive probes.
 * @property {boolean} [socketOptions.noDelay] - Disables Nagle's algorithm for sending data immediately.
 *
 * @property {string} [clientLocale] - Locale setting for the client connection.
 * @property {string} [characterEncoding] - Character encoding used for the connection.
 *
 * @property {"none" | "simple" | "exponentialBackoff"} [retryPolicy] - Policy for retrying failed connections.
 * @property {number} [retryAttempts] - Number of retry attempts for failed connections.
 * @property {number} [retryInterval] - Interval in milliseconds between retry attempts.
 */
export interface Db2ConfigOptions extends Db2BasicConnectionOptions {
  useTls?: boolean;
  sslCertificatePath?: string;
  authType?: "db2-user" | "kerberos" | "jwt";
  jwtTokenPath?: string;
  kerberosServiceName?: string;
  validateServerCertificate?: boolean;

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
  clientInfo?: string;

  enableLoadBalancing?: boolean;
  readReplicaHosts?: string[];
  primaryHost?: string;
  failoverTimeout?: number;

  cacheEnabled?: boolean;
  cacheTtl?: number;

  logQueries?: boolean;
  logErrors?: boolean;
  profileSql?: boolean;
  traceFilePath?: string;
  traceLevel?: "error" | "info" | "debug" | "trace";

  socketOptions?: {
    keepAlive?: boolean;
    keepAliveInitialDelay?: number;
    noDelay?: boolean;
  };

  clientLocale?: string;
  characterEncoding?: string;

  retryPolicy?: "none" | "simple" | "exponentialBackoff";
  retryAttempts?: number;
  retryInterval?: number;
}

/**
 * @interface Db2ConnectionOptions
 * @description Basic connection pooling options for establishing a connection to a Db2 database.
 * This interface provides a simplified set of properties for configuring database connections.
 *
 * @extends Db2BasicConnectionOptions
 *
 * @property {number} [connectionTimeout] - Timeout in milliseconds for establishing a connection.
 * @property {number} [idleTimeout] - Timeout in milliseconds for idle connections in the pool.
 * @property {number} [maxPoolSize] - Maximum number of connections in the connection pool.
 * @property {number} [minPoolSize] - Minimum number of connections in the connection pool.
 */
export interface Db2ConnectionOptions extends Db2BasicConnectionOptions {
  connectionTimeout?: number;
  idleTimeout?: number;
  maxPoolSize?: number;
  minPoolSize?: number;
}

/**
 * @interface Db2ConnectionInterface
 * @description Interface for a Db2Connection class, defining methods for managing database connections
 * and executing queries. This interface standardizes the operations required to interact with a Db2 database,
 * including connection management, query execution, and transaction handling.
 *
 * @property {Function} connect - Establishes a connection to the Db2 database.
 * @property {Function} disconnect - Closes the connection to the Db2 database.
 * @property {Function} query - Executes a SQL query against the Db2 database.
 * @property {Function} executePreparedStatement - Executes a prepared SQL statement with parameters.
 * @property {Function} beginTransaction - Begins a database transaction.
 * @property {Function} commitTransaction - Commits the current transaction.
 * @property {Function} rollbackTransaction - Rolls back the current transaction.
 * @property {Function} checkHealth - Checks the health status of the Db2 connection.
 * @property {Function} getActiveConnectionsCount - Returns the number of active connections in the pool.
 * @property {Function} drainPool - Drains the connection pool, closing all active connections.
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
