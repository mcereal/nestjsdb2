import { Connection } from './Connection';

export interface PoolOptions {
  maxPoolSize: number;
  connectionString: string;
  connectTimeout?: number; // Optional connection timeout
}

export class Pool {
  private poolSize: number;
  private connectionString: string;
  private connections: Connection[] = [];
  private usedConnections: Connection[] = [];

  constructor() {}

  async init(poolSize: number, connectionString: string): Promise<void> {
    this.poolSize = poolSize;
    this.connectionString = connectionString;

    console.log(
      `Initializing connection pool with ${this.poolSize} connections...`,
    );

    for (let i = 0; i < this.poolSize; i++) {
      try {
        console.log(`Initializing connection ${i + 1}...`);
        const conn = new Connection(this.connectionString);
        await conn.open(); // This will open the socket connection

        console.log(`Connection object created: ${JSON.stringify(conn)}`);
        this.connections.push(conn); // Add the opened connection to the pool
        console.log(`Connection ${i + 1} initialized.`);
      } catch (err) {
        console.error(`Error initializing connection ${i + 1}:`, err);
        throw err; // Ensure the error is propagated
      }
    }

    console.log(`${this.poolSize} connections initialized.`);
  }

  // Initialize the connection pool with a specified size
  async open(): Promise<Connection> {
    if (this.connections.length > 0) {
      const connection = this.connections.pop()!;
      this.usedConnections.push(connection);
      return connection;
    } else {
      throw new Error('No available connections');
    }
  }

  // Retrieve an available connection from the pool
  async getConnection(): Promise<Connection> {
    if (this.connections.length > 0) {
      const connection = this.connections.pop()!;
      this.usedConnections.push(connection);
      return connection;
    } else {
      throw new Error('No available connections');
    }
  }

  // Release a used connection back to the pool
  async releaseConnection(connection: Connection): Promise<void> {
    // Potentially reset connection state here, if necessary.
    const index = this.usedConnections.indexOf(connection);
    if (index !== -1) {
      this.usedConnections.splice(index, 1);
      this.connections.push(connection);
    }
  }

  // Close all connections in the pool
  close(connection: Connection, callback: (err: Error | null) => void): void {
    const usedIndex = this.usedConnections.indexOf(connection);
    const availableIndex = this.connections.indexOf(connection);

    if (usedIndex !== -1) {
      this.usedConnections.splice(usedIndex, 1);
    } else if (availableIndex !== -1) {
      this.connections.splice(availableIndex, 1);
    }

    // Close the specific connection with a callback for error handling
    connection.close((err) => {
      if (err) {
        console.error('Error closing connection:', err);
        callback(err); // Pass the error to the callback
      } else {
        console.log(`Connection closed.`);
        callback(null); // No error, connection closed successfully
      }
    });
  }

  // Close all connections in the pool with error handling via callback
  closeAll(callback: (err: Error | null) => void): void {
    const closePromises = this.connections
      .map(
        (conn) =>
          new Promise<void>((resolve, reject) => {
            conn.close((err) => {
              if (err) reject(err);
              else resolve();
            });
          }),
      )
      .concat(
        this.usedConnections.map(
          (conn) =>
            new Promise<void>((resolve, reject) => {
              conn.close((err) => {
                if (err) reject(err);
                else resolve();
              });
            }),
        ),
      );

    Promise.all(closePromises)
      .then(() => {
        this.connections = [];
        this.usedConnections = [];
        console.log(`All connections closed.`);
        callback(null); // Success, no error
      })
      .catch((err) => {
        callback(err); // Pass the error to the callback
      });
  }
}
