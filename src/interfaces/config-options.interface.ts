import { Db2IsolationLevel } from '../enums';
import {
  Db2AuthOptions,
  Db2ConnectionOptions,
  Db2CacheOptions,
  Db2LoggingOptions,
  Db2MigrationOptions,
  Db2RetryOptions,
} from './db2.interface';
import { IPoolOptions } from './pool-options.interface';

export interface IConfigOptions extends Db2ConnectionOptions {
  useTls?: boolean;
  sslCertificatePath?: string;

  auth: Db2AuthOptions;
  logging?: Db2LoggingOptions;
  retry?: Db2RetryOptions;
  migration?: Db2MigrationOptions;
  cache?: Db2CacheOptions;

  defaultIsolationLevel?: Db2IsolationLevel;

  poolOptions?: IPoolOptions;

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
