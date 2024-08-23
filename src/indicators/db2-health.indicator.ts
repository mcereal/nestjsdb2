// src/indicators/db2-health.indicator.ts

/**
 * @fileoverview This file contains the Db2HealthIndicator class which provides health check functionality for the Db2 database service.
 * @packageDocumentation
 * @module Db2HealthIndicator
 * @preferred
 * @version 1.0.0
 * @since 1.0.0
 * @status stable
 * @exports Db2HealthIndicator
 * @requires Logger
 * @requires Db2Service
 * @requires Db2ConnectionState
 * @class Db2HealthIndicator
 * @classdesc This class provides health check functionality for the Db2 database service.
 * @public
 * @hideconstructor
 */

import { Logger } from "@nestjs/common"; // Assuming we are still using the Logger from NestJS for consistency.
import { Db2Service } from "../services/db2.service"; // Importing the Db2Service
import { Db2ConnectionState } from "../enums/db2.enums"; // Importing Db2 connection states

/**
 * @class Db2HealthIndicator
 * @classdesc This class provides health check functionality for the Db2 database service.
 * @public
 */
export class Db2HealthIndicator {
  private readonly logger = new Logger(Db2HealthIndicator.name);

  constructor(private readonly db2Service: Db2Service) {}

  /**
   * Checks the health of the Db2 connection.
   * @returns A promise that resolves to a boolean indicating whether the connection is healthy.
   * @throws Error if the health check fails.
   */
  async isHealthy(): Promise<boolean> {
    this.logger.log("Performing Db2 health check...");

    try {
      // Check the current connection state
      const connectionState = this.db2Service.getState();
      if (connectionState !== Db2ConnectionState.CONNECTED) {
        this.logger.warn(
          `Db2 connection state is not CONNECTED: ${connectionState}`
        );
        throw new Error(`Db2 connection state is ${connectionState}`);
      }

      // Perform a basic query to verify the connection
      const healthCheckResult = await this.db2Service.checkHealth();
      if (!healthCheckResult) {
        this.logger.warn("Db2 health check query failed.");
        throw new Error("Db2 health check query failed");
      }

      this.logger.log("Db2 is healthy.");
      return true;
    } catch (error) {
      this.logger.error("Db2 health check failed", error.message);
      throw new Error(`Db2 health check failed: ${error.message}`);
    }
  }
}
