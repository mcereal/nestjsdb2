// src/interfaces/index.ts

/**
 * @fileoverview This file serves as the entry point for the interfaces module.
 * It exports all the interfaces available in the module, including Db2ConfigOptions.
 * This allows consumers of the module to easily import and use the interfaces in their applications.
 *
 * @requires ConfigOptions from "./db2.interface"
 * @requires Client from "./db2-client.interface"
 * @requires TransactionManager from "./transaction-manager.interface"
 * @requires QueryBuilder from "./query-builder.interface"
 * @requires MigrationService from "./db2-migration-service.interface"
 *
 * @exports ConfigOptions
 * @exports Client
 * @exports TransactionManager
 * @exports QueryBuilder
 * @exports MigrationService
 * @exports ConnectionManager
 * @exports IPoolManager
 * @exports IConnectionManager
 * @exports ITransactionManager
 * @exports IMigrationService
 * @exports IClient
 * @exports IConfigOptions
 */

export * from './db2.interface';
export * from './client.interface';
export * from './transaction-manager.interface';
export * from './query-builder.interface';
export * from './migration-service.interface';
export * from './connection-mannager.interface';
export * from './pool-manager.interface';
export * from './transaction-manager.interface';
export * from './config-options.interface';
export * from './kerberos-client.interface';
export * from './logger.interface';
export * from './config-manager.interface';
export * from './pool-options.interface';
export * from './pool.interface';
export * from './pool-manager.interface';
export * from './factory.interface';
