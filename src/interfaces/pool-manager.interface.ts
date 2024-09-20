// src/interfaces/pool-manager.interface.ts

import { Pool } from 'generic-pool';
import { Connection } from 'ibm_db';

/**
 * PoolManager interface
 */

export interface IPoolManager {
  init(): Promise<void>;
  getPool: Pool<Connection>;
  isPoolInitialized: boolean;
  getConnection(): Promise<Connection>;
  closeConnection(connection: Connection): Promise<void>;
  drainPool(): Promise<void>;
  releaseConnection(connection: Connection): Promise<void>;
}
