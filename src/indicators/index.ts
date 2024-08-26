// src/indicators/index.ts

/**
 * @fileoverview This file serves as the entry point for the indicators module.
 * It exports the main Db2HealthIndicator, which is the entry point for the module.
 * This allows consumers of the module to easily import and use the module in their applications.
 *
 * @requires Db2HealthIndicator from "./db2-health.indicator"
 *
 * @exports Db2HealthIndicator
 */

export * from "./db2-health.indicator"; // Export the main module
