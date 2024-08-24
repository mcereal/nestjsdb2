// src/index.ts

/**
 * @fileoverview This file serves as the entry point for the Db2 module.
 * It exports all the necessary components of the module, including the main module,
 * services, interfaces, enums, query builders, errors, decorators, and utilities. This allows
 * consumers of the module to easily import and use the components in their applications.
 *
 * @requires Db2Module from "./modules/db2.module"
 * @requires Db2Service from "./services/db2.service"
 * @requires Db2QueryBuilder from "./query-builder/db2.query-builder"
 * @requires Db2Error from "./errors/db2.error"
 * @requires Db2Connection from "./db/db2-connection"
 * @requires TransactionManager from "./db/transaction-manager"
 * @requires SocketManager from "./db/socket-manager"
 * @requires Db2Utils from "./utils/db2.utils"
 * @requires SocketUtils from "./db/socket-utils"
 * @requires Db2HealthIndicator from "./indicators/db2-health.indicator"
 * @requires * from "./decorators"
 * @requires * from "./interfaces"
 * @requires * from "./enums"
 *
 * @exports Db2Module
 * @exports Db2Service
 * @exports Db2QueryBuilder
 * @exports Db2Error
 * @exports Db2Connection
 * @exports TransactionManager
 * @exports SocketManager
 * @exports Db2Utils
 * @exports SocketUtils
 * @exports Db2HealthIndicator
 * @exports * from "./decorators"
 * @exports * from "./interfaces"
 * @exports * from "./enums"
 */

export * from "./modules/db2.module"; // Export the main Db2Module
export * from "./services/db2.service"; // Export the Db2Service
export * from "./interfaces"; // Export necessary interfaces
export * from "./enums"; // Export enums used in the module
export * from "./query-builder/db2.query-builder"; // Export the query builder
export * from "./errors/db2.error"; // Export any custom errors
export * from "./db/db2-connection"; // Export the custom Db2Connection
export * from "./db/transaction-manager"; // Export the custom TransactionManager
export * from "./db/socket-manager"; // Export the custom SocketManager
export * from "./utils/db2.utils"; // Export any utility functions
export * from "./db/socket-utils"; // Export the custom SocketUtils
export * from "./db/socket-manager"; // Export the custom SocketManager
export * from "./db/socket-utils"; // Export the custom SocketUtils
export * from "./indicators/db2-health.indicator"; // Export any performance indicators
export * from "./decorators"; // Export all decorators
