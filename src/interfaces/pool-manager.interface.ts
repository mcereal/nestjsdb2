// src/interfaces/pool-manager.interface.ts

import { AuthStrategy } from '../auth';
import { Connection } from '../db/connection';
import { IPool } from './pool.interface';

/**
 * PoolManager interface
 */

export interface IPoolManager {
  setAuthStrategy(authStrategy: AuthStrategy): void;
  init(): Promise<void>;
  getPool: IPool<Connection>;
  isPoolInitialized: boolean;
  getConnection(): Promise<Connection>;
  closeConnection(connection: Connection): Promise<void>;
  drainPool(): Promise<void>;
  releaseConnection(connection: Connection): Promise<void>;
}
