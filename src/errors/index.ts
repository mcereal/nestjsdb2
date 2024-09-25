// src/errors/index.ts

/**
 * @fileoverview This file serves as the entry point for the errors module.
 * It exports all the errors available in the module, including Db2Error.
 * This allows consumers of the module to easily import and use the errors in their applications.
 *
 * @requires Db2Error from "./db2.error"
 * @requires HealthCheckError from "./health-check.error"
 *
 * @exports Db2Error
 * @exports HealthCheckError
 *
 */

export * from './db2.error';
export * from './health-check.error';
