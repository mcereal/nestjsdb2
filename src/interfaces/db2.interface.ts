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
 * Authentication base interface.
 */
interface Db2BaseAuthOptions {
  authType: "password" | "kerberos" | "jwt" | "ldap";
}

/**
 * Interface for password-based authentication options.
 */
export interface Db2PasswordAuthOptions extends Db2BaseAuthOptions {
  authType: "password";
  username: string;
  password: string;
}

/**
 * Interface for Kerberos authentication options.
 */
export interface Db2KerberosAuthOptions extends Db2BaseAuthOptions {
  authType: "kerberos";
  username: string;
  krbServiceName: string; // Service name for Kerberos
  krb5Config?: string; // Optional path to the krb5.conf file
  krbKeytab?: string; // Optional path to the keytab file
}

/**
 * Interface for JWT-based authentication options.
 */
export interface Db2JwtAuthOptions extends Db2BaseAuthOptions {
  authType: "jwt";
  jwtToken: string;
  jwtSecret: string; // Secret or public key to verify the token
}

/**
 * Interface for LDAP-based authentication options.
 */
export interface Db2LdapAuthOptions extends Db2BaseAuthOptions {
  authType: "ldap";
  username: string;
  password: string;
  ldapUrl: string; // URL for the LDAP server
}

/**
 * Union of all possible authentication options.
 */
export type Db2AuthOptions =
  | Db2PasswordAuthOptions
  | Db2KerberosAuthOptions
  | Db2JwtAuthOptions
  | Db2LdapAuthOptions;

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

/**
 * Comprehensive configuration options for setting up a Db2 connection.
 */
export interface Db2ConfigOptions extends Db2BasicConnectionOptions {
  useTls?: boolean;
  sslCertificatePath?: string;

  auth: Db2AuthOptions; // Authentication section (now a union of multiple auth types)
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
  maxIdleConnections?: number;

  fetchSize?: number;
  queryTimeout?: number;
  autoCommit?: boolean;
  statementCacheSize?: number;
  prefetchSize?: number;

  characterEncoding?: string;
  securityMechanism?: string;
  currentSchema?: string;
  applicationName?: string;
}
