import { Connection } from './Connection';

export interface PoolOptions {
  max: number;
  min: number;
  acquireTimeoutMillis: number;
}

export class Pool {
  private maxPoolSize: number;
  private minPoolSize: number;
  private acquireTimeoutMillis: number;
  private connectionString: string;
  private connections: Connection[] = [];
  private usedConnections: Connection[] = [];
  private pendingRequests: {
    resolve: (conn: Connection) => void;
    reject: (err: Error) => void;
    timer: NodeJS.Timeout;
  }[] = [];

  constructor() {}

  async init(options: PoolOptions, connectionString: string): Promise<void> {
    this.maxPoolSize = options.max;
    this.minPoolSize = options.min;
    this.acquireTimeoutMillis = options.acquireTimeoutMillis;
    this.connectionString = connectionString;

    this.log(
      `Initializing connection pool with min ${this.minPoolSize} and max ${this.maxPoolSize} connections...`,
    );

    // Initialize minPoolSize number of connections
    for (let i = 0; i < this.minPoolSize; i++) {
      try {
        this.log(`Initializing connection ${i + 1}...`);
        const conn = new Connection(this.connectionString);
        await conn.open(); // This will open the socket connection

        this.connections.push(conn); // Add the opened connection to the pool
        this.log(`Connection ${i + 1} initialized.`);
      } catch (err) {
        this.log(`Error initializing connection ${i + 1}: ${err}`);
        throw err; // Ensure the error is propagated
      }
    }

    this.log(`${this.connections.length} connections initialized.`);
  }

  // Retrieve an available connection from the pool
  async getConnection(): Promise<Connection> {
    if (this.connections.length > 0) {
      const connection = this.connections.pop()!;
      this.usedConnections.push(connection);
      return connection;
    } else if (
      this.usedConnections.length + this.connections.length <
      this.maxPoolSize
    ) {
      // Create a new connection
      const conn = new Connection(this.connectionString);
      await conn.open();
      this.usedConnections.push(conn);
      return conn;
    } else {
      // Wait for a connection to become available
      return new Promise<Connection>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('Acquire connection timeout'));
        }, this.acquireTimeoutMillis);

        this.pendingRequests.push({ resolve, reject, timer });
      });
    }
  }

  // Release a used connection back to the pool
  async releaseConnection(connection: Connection): Promise<void> {
    const index = this.usedConnections.indexOf(connection);
    if (index !== -1) {
      this.usedConnections.splice(index, 1);

      // Check if there are pending requests
      if (this.pendingRequests.length > 0) {
        const { resolve, timer } = this.pendingRequests.shift()!;
        clearTimeout(timer);
        resolve(connection);
      } else {
        this.connections.push(connection);
      }
    }
  }

  // Close a specific connection
  async closeConnection(connection: Connection): Promise<void> {
    const usedIndex = this.usedConnections.indexOf(connection);
    const availableIndex = this.connections.indexOf(connection);

    if (usedIndex !== -1) {
      this.usedConnections.splice(usedIndex, 1);
    } else if (availableIndex !== -1) {
      this.connections.splice(availableIndex, 1);
    }

    await connection.close();
    this.log(`Connection closed.`);
  }

  // Close all connections in the pool
  async closeAll(): Promise<void> {
    const closePromises = this.connections
      .map((conn) => conn.close())
      .concat(this.usedConnections.map((conn) => conn.close()));

    await Promise.all(closePromises);
    this.connections = [];
    this.usedConnections = [];
    this.log(`All connections closed.`);
  }

  private log(message: string): void {
    console.log(`[Pool] ${message}`);
  }
}
