/**
 * @fileoverview This file contains the definition of various enums used for Db2 database connection
 * management and configurations, such as Db2ConnectionState, Db2IsolationLevel, and Db2AuthType.
 *
 * @enum {string} Db2ConnectionState
 * @enum {string} Db2IsolationLevel
 * @enum {string} Db2AuthType
 *
 * @exports Db2ConnectionState
 * @exports Db2IsolationLevel
 * @exports Db2AuthType
 */

/**
 * @enum Db2ConnectionState
 * @description An enumeration of possible states for a Db2 database connection.
 */
export enum Db2ConnectionState {
  INITIALIZING = 'INITIALIZING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  DISCONNECTING = 'DISCONNECTING',
  ERROR = 'ERROR',
  CONNECTING = 'CONNECTING',
  RECONNECTING = 'RECONNECTING',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  CONNECTION_CLOSED = 'CONNECTION_CLOSED',
  POOL_DRAINING = 'POOL_DRAINING',
  POOL_DRAINED = 'POOL_DRAINED',
  AUTHENTICATING = 'AUTHENTICATING',
  AUTH_FAILED = 'AUTH_FAILED',
}

/**
 * @enum Db2IsolationLevel
 * @description An enumeration of possible isolation levels for Db2 transactions.
 */
export enum Db2IsolationLevel {
  READ_UNCOMMITTED = 'READ UNCOMMITTED',
  READ_COMMITTED = 'READ COMMITTED',
  REPEATABLE_READ = 'REPEATABLE READ',
  SERIALIZABLE = 'SERIALIZABLE',
  CURSOR_STABILITY = 'CURSOR STABILITY',
  UNCOMMITTED_READ = 'UNCOMMITTED READ',
}

/**
 * @enum Db2AuthType
 * @description An enumeration of possible authentication types for Db2 connections.
 */
export enum Db2AuthType {
  PASSWORD = 'password', // Standard username and password authentication
  KERBEROS = 'kerberos', // Kerberos authentication
  JWT = 'jwt', // JWT-based authentication
  LDAP = 'ldap', // LDAP-based authentication
}
