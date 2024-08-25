// src/interfaces/db2.interface.ts

import { Db2ConnectionState } from "src/enums";

/**
 * @fileoverview This file contains the definitions of interfaces used for configuring and managing
 * Db2 database connections. These interfaces provide a standardized way to define and use Db2 connection settings,
 * ensuring consistent implementation across the application.
 *
 * @interface Db2BasicConnectionOptions
 * @interface Db2ConfigOptions
 * @interface Db2ConnectionInterface
 *
 * @exports Db2BasicConnectionOptions
 * @exports Db2ConfigOptions
 * @exports Db2ConnectionInterface
 */

/**
 * @interface Db2BasicConnectionOptions
 * @description Basic connection properties required for establishing a connection to a Db2 database.
 * These options are essential for connecting to the database.
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
  database: string;
}

/**
 * @interface Db2ConfigOptions
 * @description Comprehensive configuration options for setting up a Db2 connection.
 * This interface extends Db2BasicConnectionOptions and includes additional settings for
 * security, performance, logging, and error handling.
 *
 * @extends Db2BasicConnectionOptions
 *
 * @property {boolean} [useTls] - Enables TLS for secure connections.
 * @property {string} [sslCertificatePath] - Path to the SSL certificate for secure connections.
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
 * @property {boolean} [logQueries] - Enables logging of executed queries.
 * @property {boolean} [logErrors] - Enables logging of errors encountered during execution.
 * @property {boolean} [profileSql] - Enables SQL profiling for performance analysis.
 * @property {string} [traceFilePath] - File path for saving trace logs.
 * @property {"error" | "info" | "debug" | "trace"} [traceLevel] - Log level for tracing.
 *
 * @property {string} [characterEncoding] - Character encoding used for the connection.
 * @property {string} [securityMechanism] - Security mechanism for the connection (e.g., USER_ONLY_SECURITY).
 * @property {string} [currentSchema] - The default schema to use for the connection.
 * @property {string} [applicationName] - Name of the application connecting to the database.
 * @property {boolean} [tcpKeepAlive] - Enables TCP keep-alive packets to maintain idle connections.
 * @property {number} [connectionRetries] - Number of connection retry attempts.
 * @property {number} [retryDelay] - Delay in milliseconds between connection retry attempts.
 * @property {string} [authenticationType] - Authentication type (e.g., USER_PASSWORD, JWT, KERBEROS).
 *
 * @property {"none" | "simple" | "exponentialBackoff"} [retryPolicy] - Policy for retrying failed connections.
 * @property {number} [retryAttempts] - Number of retry attempts for failed connections.
 * @property {number} [retryInterval] - Interval in milliseconds between retry attempts.
 */
export interface Db2ConfigOptions extends Db2BasicConnectionOptions {
  useTls?: boolean;
  sslCertificatePath?: string;

  auth?: Db2AuthOptions;

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

  logQueries?: boolean;
  logErrors?: boolean;
  profileSql?: boolean;
  traceFilePath?: string;
  traceLevel?: "error" | "info" | "debug" | "trace";

  characterEncoding?: string;
  securityMechanism?: string;
  currentSchema?: string;
  applicationName?: string;
  tcpKeepAlive?: boolean;
  connectionRetries?: number;
  retryDelay?: number;
  authenticationType?: string;

  retryPolicy?: "none" | "simple" | "exponentialBackoff";
  retryAttempts?: number;
  retryInterval?: number;

  failoverHost?: string;
  failoverPort?: number;
  maxReconnectAttempts?: number; // Number of attempts before failing over
  reconnectInterval?: number; // Delay in ms between reconnect attempts
}

/**
 * @interface Db2AuthOptions
 * @description Options specific to different authentication methods supported by the Db2 client.
 *
 * @property {"password" | "kerberos"} authType - The type of authentication to use.
 * @property {string} [username] - Username for password-based authentication.
 * @property {string} [password] - Password for password-based authentication.
 * @property {string} [krbServiceName] - Service name for Kerberos authentication (optional).
 * @property {string} [krb5Config] - Path to the Kerberos configuration file (optional).
 * @property {string} [krbKeytab] - Path to the Kerberos keytab file (optional).
 */
export interface Db2AuthOptions {
  authType: "password" | "kerberos" | "jwt";
  username?: string; // Add username here
  password?: string; // Add password here
  krbServiceName?: string; // For Kerberos
  krb5Config?: string; // Path to the Kerberos configuration file
  krbKeytab?: string; // Path to the Kerberos keytab file

  // JWT-specific options
  jwtToken?: string; // JWT token used for authentication
  jwtSecret?: string; // Secret used to validate the JWT
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
 * @property {Function} getState - Returns the current state of the Db2 connection.
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
  getState(): Db2ConnectionState;
  getActiveConnectionsCount(): number;
  drainPool(): Promise<void>;
}
