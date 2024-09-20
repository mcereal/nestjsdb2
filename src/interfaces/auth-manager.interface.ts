// src/type/auth-manager.interface.ts

import { Db2AuthStrategy } from '../auth';
import { Db2AuthOptions } from './db2.interface';

/**
 * Interface for the authentication manager.
 */
export interface IAuthManager {
  /**
   * Perform the authentication process.
   */
  authenticate(): Promise<void>;

  /**
   * Build the connection string including authentication details.
   */
  buildConnectionString(): string;

  /**
   * Get the authentication strategy used by the manager.
   */
  getAuthStrategy(): Db2AuthStrategy;
}
