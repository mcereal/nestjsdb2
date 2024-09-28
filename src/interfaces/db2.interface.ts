import { Db2AuthType } from '../enums';

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
  authType: Db2AuthType;
}

/**
 * Interface for password-based authentication options.
 */
export interface Db2PasswordAuthOptions extends Db2BaseAuthOptions {
  username: string;
  password: string;
}

/**
 * Interface for Kerberos authentication options.
 */
export interface Db2KerberosAuthOptions extends Db2BaseAuthOptions {
  authType: Db2AuthType.KERBEROS;
  krbServiceName: string;
  username: string;
  krbKeytab?: string; // Optional path to keytab file
  krbKdc?: string; // Optional KDC host
  password?: string; // Optional password for password-based kinit
}

/**
 * Interface for JWT-based authentication options.
 */
export interface Db2JwtAuthOptions extends Db2BaseAuthOptions {
  authType: Db2AuthType.JWT;
  jwtToken: string;
  jwtSecret: string; // Secret or public key to verify the token
}

/**
 * Interface for LDAP-based authentication options.
 */
export interface Db2LdapAuthOptions extends Db2BaseAuthOptions {
  authType: Db2AuthType.LDAP;
  username: string;
  password: string;
  ldapUrl: string; // URL for the LDAP server
  tlsOptions?: {
    rejectUnauthorized?: boolean; // Reject unauthorized TLS connections
    ca?: string; // Custom CA certificate
    key?: string; // Private key
    cert?: string; // Public certificate
  };
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
  traceLevel?: 'error' | 'info' | 'debug' | 'trace';
}

/**
 * Interface for retry and failover options.
 */
export interface Db2RetryOptions {
  retryPolicy?: 'none' | 'simple' | 'exponentialBackoff';
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
  tableName?: string;
  runOnStart?: boolean;
  logQueries?: boolean;
  logErrors?: boolean;
  dryRun?: boolean;
  skipOnFail?: boolean;
  ignoreMissing?: boolean;
  ignoreExecuted?: boolean;
  ignoreErrors?: boolean;
  markAsExecuted?: boolean;
}

/**
 * Interface for cache options.
 */
export interface Db2CacheOptions {
  enabled: boolean;
  store: 'memory' | 'redis';
  ttl?: number; // Time to live for cached items, in seconds
  max?: number; // Maximum number of items to cache
  redisHost?: string; // For Redis configuration
  redisPort?: number; // For Redis configuration
  redisPassword?: string; // For Redis configuration
  resetOnDestroy?: boolean; // Reset cache on service destroy
}
