// src/interfaces/db2.interface.ts

import { Db2IsolationLevel } from "../enums";
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
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
}

/**
 * Interface for migration options.
 */
export interface Db2MigrationOptions {
  enabled: boolean;
  migrationDir: string;
  tableName?: string;
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

export interface SqlInjectionCheckerOptions {
  enableStrictMode?: boolean; // Enable strict mode for production
  whitelistedPatterns?: RegExp[]; // Allow certain patterns
  logWarnings?: boolean; // Log warnings instead of throwing errors
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

  defaultIsolationLevel?: Db2IsolationLevel;

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

  sqlInjectionCheckerOptions?: SqlInjectionCheckerOptions;
}
