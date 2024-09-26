// src/interfaces/pool-manager.interface.ts

import { Pool } from '../db/Pool';
import { Connection } from '../db/Connection';

/**
 * PoolManager interface
 */

export interface IPoolManager {
  init(): Promise<void>;
  getPool: Pool;
  isPoolInitialized: boolean;
  getConnection(): Promise<Connection>;
  closeConnection(connection: Connection): Promise<void>;
  drainPool(): Promise<void>;
  releaseConnection(connection: Connection): Promise<void>;
}
