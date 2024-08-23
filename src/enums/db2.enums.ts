export enum Db2ConnectionState {
  CONNECTED = "CONNECTED", // Successfully connected to the DB2 database
  DISCONNECTED = "DISCONNECTED", // Disconnected from the DB2 database
  ERROR = "ERROR", // An error has occurred with the DB2 connection
  CONNECTING = "CONNECTING", // Currently attempting to establish a connection
  RECONNECTING = "RECONNECTING", // Attempting to reconnect after a connection loss
  CONNECTION_REFUSED = "CONNECTION_REFUSED", // Connection attempt was refused
  CONNECTION_TIMEOUT = "CONNECTION_TIMEOUT", // Connection attempt timed out
  CONNECTION_CLOSED = "CONNECTION_CLOSED", // Connection was closed intentionally
  FAILOVER_IN_PROGRESS = "FAILOVER_IN_PROGRESS", // Failover to a replica is in progress
  POOL_DRAINED = "POOL_DRAINED", // Connection pool has been drained
}
