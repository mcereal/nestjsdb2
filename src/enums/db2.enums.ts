// src/enums/db2.enums.ts

/**
 * @fileoverview This file contains the definition of the Db2ConnectionState enum.
 * The Db2ConnectionState enum is used to represent various states of a Db2 database connection.
 * These states provide a standardized way to manage and track the connection status within
 * the application, enabling consistent handling of connection-related scenarios such as
 * connection establishment, errors, disconnections, and failovers.
 *
 * @enum {string} Db2ConnectionState
 *
 * @exports Db2ConnectionState
 */

/**
 * @enum Db2ConnectionState
 * @description An enumeration of possible states for a Db2 database connection.
 * These states help in tracking and managing the lifecycle of a Db2 connection,
 * facilitating error handling, monitoring, and operational control.
 *
 * @readonly
 * @property {string} CONNECTED - Indicates that the connection to the Db2 database is successfully established.
 * @property {string} DISCONNECTED - Indicates that the connection to the Db2 database has been disconnected.
 * @property {string} ERROR - Indicates that an error has occurred with the Db2 connection.
 * @property {string} CONNECTING - Indicates that the system is currently attempting to establish a connection to the Db2 database.
 * @property {string} RECONNECTING - Indicates that the system is attempting to reconnect to the Db2 database after a connection loss.
 * @property {string} CONNECTION_REFUSED - Indicates that a connection attempt to the Db2 database was refused.
 * @property {string} CONNECTION_TIMEOUT - Indicates that a connection attempt to the Db2 database has timed out.
 * @property {string} CONNECTION_CLOSED - Indicates that the connection to the Db2 database was intentionally closed.
 * @property {string} FAILOVER_IN_PROGRESS - Indicates that a failover to a replica Db2 database is currently in progress.
 * @property {string} POOL_DRAINED - Indicates that the connection pool has been drained, closing all active connections.
 * @property {string} AUTHENTICATING - Indicates that the system is currently authenticating with the Db2 database.
 * @property {string} AUTH_FAILED - Indicates that authentication with the Db2 database has failed.
 */

export enum Db2ConnectionState {
  CONNECTED = "CONNECTED", // Successfully connected to the DB2 database
  DISCONNECTED = "DISCONNECTED", // Disconnected from the DB2 database
  DISCONNECTING = "DISCONNECTING", // Currently disconnecting from the DB2 database
  ERROR = "ERROR", // An error has occurred with the DB2 connection
  CONNECTING = "CONNECTING", // Currently attempting to establish a connection
  RECONNECTING = "RECONNECTING", // Attempting to reconnect after a connection loss
  CONNECTION_REFUSED = "CONNECTION_REFUSED", // Connection attempt was refused
  CONNECTION_TIMEOUT = "CONNECTION_TIMEOUT", // Connection attempt timed out
  CONNECTION_CLOSED = "CONNECTION_CLOSED", // Connection was closed intentionally
  FAILOVER_IN_PROGRESS = "FAILOVER_IN_PROGRESS", // Failover to a replica is in progress
  POOL_DRAINED = "POOL_DRAINED", // Connection pool has been drained
  AUTHENTICATING = "AUTHENTICATING", // Authenticating with the DB2 database
  AUTH_FAILED = "AUTH_FAILED", // Authentication with the DB2 database failed
}

export enum Db2IsolationLevel {
  READ_UNCOMMITTED = "READ UNCOMMITTED", // Dirty reads, non-repeatable reads, phantom reads
  READ_COMMITTED = "READ COMMITTED", // No dirty reads, possible non-repeatable reads, phantom reads
  REPEATABLE_READ = "REPEATABLE READ", // No dirty reads, no non-repeatable reads, possible phantom reads
  SERIALIZABLE = "SERIALIZABLE", // No dirty reads, no non-repeatable reads, no phantom reads
  CURSOR_STABILITY = "CURSOR STABILITY", // No dirty reads, no non-repeatable reads, no phantom reads
  UNCOMMITTED_READ = "UNCOMMITTED READ", // Dirty reads, non-repeatable reads, phantom reads
}
