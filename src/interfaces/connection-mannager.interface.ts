import { Db2ClientState } from "./db2-client.interface";

import { Connection } from "ibm_db";

export interface IConnectionManager {
  setState(newState: Partial<Db2ClientState>): void;
  getState(): Db2ClientState;
  getConnection(): Promise<Connection>;
  closeConnection(connection: Connection): Promise<void>;
  disconnect(): Promise<void>;
  drainPool(): Promise<void>;
  logPoolStatus(): void;
  checkHealth(): Promise<{ status: boolean; details?: any }>;
  getActiveConnectionsCount(): number;
}
