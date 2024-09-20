import { Db2IsolationLevel } from '../enums';
import {
  Db2AuthOptions,
  Db2BasicConnectionOptions,
  Db2CacheOptions,
  Db2LoggingOptions,
  Db2MigrationOptions,
  Db2RetryOptions,
} from './db2.interface';

export interface IDb2ConfigOptions extends Db2BasicConnectionOptions {
  useTls?: boolean;
  sslCertificatePath?: string;

  auth: Db2AuthOptions; // Authentication section (now a union of multiple auth types)
  logging?: Db2LoggingOptions;
  retry?: Db2RetryOptions;
  migration?: Db2MigrationOptions;
  cache?: Db2CacheOptions;

  defaultIsolationLevel?: Db2IsolationLevel;

  connectionTimeout?: number;
  idleTimeout?: number;
  maxPoolSize?: number;
  minPoolSize?: number;
  acquireTimeoutMillis?: number;
  maxLifetime?: number;
  connectionTestQuery?: string;
  maxIdleConnections?: number;

  fetchSize?: number;
  queryTimeout?: number;
  autoCommit?: boolean;
  statementCacheSize?: number;
  prefetchSize?: number;

  characterEncoding?: string;
  securityMechanism?: string;
  currentSchema?: string;
  applicationName?: string;
}
