// src/config/db2.production.config.ts

import { registerAs } from '@nestjs/config';
import * as Joi from 'joi'; // This import is not needed here
import { IConfigOptions } from '@mcereal/nestjsdb2';
import { Db2AuthType } from '@mcereal/nestjsdb2';

export default registerAs(
  'db2',
  (): IConfigOptions => ({
    host: process.env.DB2_HOSTNAME || 'defaultHost',
    port: parseInt(process.env.DB2_PORT || '30376', 10),
    database: process.env.DB2_DATABASE || 'defaultDatabase',
    auth: {
      authType: process.env.DB2_AUTH_TYPE as Db2AuthType,
      username: process.env.DB2_UID || 'defaultUsername',
      password: process.env.DB2_PWD || 'defaultPassword',
    },
    useTls: process.env.DB2_USE_TLS === 'true',
    sslCertificatePath: process.env.DB2_SSL_CERT_PATH,
    retry: {
      maxReconnectAttempts: parseInt(
        process.env.DB2_MAX_RECONNECT_ATTEMPTS || '3',
        10,
      ),
      reconnectInterval: parseInt(
        process.env.DB2_RECONNECT_INTERVAL || '5000',
        10,
      ),
    },
    cache: {
      enabled: process.env.DB2_CACHE_ENABLED !== 'false',
      store: (process.env.DB2_CACHE_STORE as 'memory' | 'redis') || 'memory',
    },
    migration: {
      enabled: process.env.DB2_MIGRATION_ENABLED === 'true',
      runOnStart: process.env.DB2_MIGRATION_RUN_ON_START === 'true',
      logQueries: process.env.DB2_MIGRATION_LOG_QUERIES === 'true',
      logErrors: process.env.DB2_MIGRATION_LOG_ERRORS === 'true',
      dryRun: process.env.DB2_MIGRATION_DRY_RUN === 'true',
      skipOnFail: process.env.DB2_MIGRATION_SKIP_ON_FAIL === 'true',
      ignoreMissing: process.env.DB2_MIGRATION_IGNORE_MISSING === 'true',
      ignoreExecuted: process.env.DB2_MIGRATION_IGNORE_EXECUTED === 'true',
      ignoreErrors: process.env.DB2_MIGRATION_IGNORE_ERRORS === 'true',
      markAsExecuted: process.env.DB2_MIGRATION_MARK_AS_EXECUTED === 'true',
    },
    logging: {
      logQueries: process.env.DB2_LOG_QUERIES === 'true',
      logErrors: process.env.DB2_LOG_ERRORS === 'true',
      profileSql: process.env.DB2_PROFILE_SQL === 'true',
    },
  }),
);
