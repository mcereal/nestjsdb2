// src/config/db2.config.ts

import { registerAs } from "@nestjs/config";
import { IDb2ConfigOptions } from "../interfaces";
import { Db2AuthType } from "src/enums";

export default registerAs(
  "db2",
  (): IDb2ConfigOptions => ({
    host: process.env.DB2_HOST,
    port: parseInt(process.env.DB2_PORT, 10),
    database: process.env.DB2_DATABASE,
    auth: {
      authType: process.env.DB2_AUTH_TYPE as Db2AuthType,
      username: process.env.DB2_USERNAME,
      password: process.env.DB2_PASSWORD,
    },
    useTls: process.env.DB2_USE_TLS === "true",
    sslCertificatePath: process.env.DB2_SSL_CERT_PATH,
    retry: {
      maxReconnectAttempts:
        parseInt(process.env.DB2_MAX_RECONNECT_ATTEMPTS, 10) || 3,
      reconnectInterval:
        parseInt(process.env.DB2_RECONNECT_INTERVAL, 10) || 5000,
    },
    cache: {
      enabled: process.env.DB2_CACHE_ENABLED === "true",
      store: (process.env.DB2_CACHE_STORE as "memory" | "redis") || "memory",
    },
    migration: {
      enabled: process.env.DB2_MIGRATION_ENABLED === "true",
      migrationDir: "",
      fileExtension: "",
      runOnStart: false,
      logQueries: false,
      logErrors: false,
      dryRun: false,
      skipOnFail: false,
      ignoreMissing: false,
      ignoreExecuted: false,
      ignoreErrors: false,
      markAsExecuted: false,
    },
    logging: {
      logQueries: process.env.DB2_LOG_QUERIES === "true",
      logErrors: process.env.DB2_LOG_ERRORS === "true",
      profileSql: process.env.DB2_PROFILE_SQL === "true",
    },
  })
);
