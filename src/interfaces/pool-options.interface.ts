// src/interfaces/pool-options.interface.ts

export interface IPoolOptions {
  maxPoolSize: number; // Maximum number of connections
  minPoolSize: number; // Minimum number of connections
  acquireTimeoutMillis?: number; // Timeout for acquiring a connection
  idleTimeoutMillis?: number; // Timeout for idle connections
  maxLifetime?: number; // Maximum lifetime of a connection
  validationFunction?: (resource: any) => Promise<boolean>; // Function to validate resources before reuse
  maxWaitingClients?: number; // Maximum number of clients waiting for a connection
  idleCheckIntervalMillis?: number; // Interval for checking idle resources
}
