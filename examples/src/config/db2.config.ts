// src/config/db2.config.ts

import { registerAs } from '@nestjs/config';
import * as Joi from 'joi'; // This import is not needed here
import { IConfigOptions } from '@mcereal/nestjsdb2';
import { Db2AuthType } from '@mcereal/nestjsdb2';

export default registerAs(
  'db2',
  (): IConfigOptions => ({
    host: process.env.DB2_HOSTNAME || 'default_hostname',
    port: parseInt(process.env.DB2_PORT || '30376', 10),
    database: process.env.DB2_DATABASE || 'default_database',
    auth: {
      authType: process.env.DB2_AUTH_TYPE as Db2AuthType,
      username: process.env.DB2_UID || 'default_username',
      password: process.env.DB2_PWD || 'default_password',
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

export const db2ValidationSchema = Joi.object({
  DB2_HOSTNAME: Joi.string().hostname().required(),
  DB2_PORT: Joi.number().port().required(),
  DB2_DATABASE: Joi.string().required(),
  DB2_AUTH_TYPE: Joi.string()
    .valid(...Object.values(Db2AuthType))
    .required(),
  DB2_UID: Joi.string().required(),
  DB2_PWD: Joi.string().required(),
  DB2_USE_TLS: Joi.boolean().truthy('true').falsy('false').default(false),
  DB2_SSL_CERT_PATH: Joi.string().required(),
  DB2_MAX_RECONNECT_ATTEMPTS: Joi.number().integer().min(0).default(3),
  DB2_RECONNECT_INTERVAL: Joi.number().integer().min(1000).default(5000),
  DB2_CACHE_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
  DB2_CACHE_STORE: Joi.string().valid('memory', 'redis').default('memory'),
  DB2_MIGRATION_ENABLED: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(false),
  DB2_MIGRATION_RUN_ON_START: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(false),
  DB2_MIGRATION_LOG_QUERIES: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(false),
  DB2_MIGRATION_LOG_ERRORS: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(false),
  DB2_MIGRATION_DRY_RUN: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(false),
  DB2_MIGRATION_SKIP_ON_FAIL: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(false),
  DB2_MIGRATION_IGNORE_MISSING: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(false),
  DB2_MIGRATION_IGNORE_EXECUTED: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(false),
  DB2_MIGRATION_IGNORE_ERRORS: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(false),
  DB2_MIGRATION_MARK_AS_EXECUTED: Joi.boolean()
    .truthy('true')
    .falsy('false')
    .default(false),
  DB2_LOG_QUERIES: Joi.boolean().truthy('true').falsy('false').default(false),
  DB2_LOG_ERRORS: Joi.boolean().truthy('true').falsy('false').default(true),
  DB2_PROFILE_SQL: Joi.boolean().truthy('true').falsy('false').default(false),
});
