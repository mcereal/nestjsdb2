// src/indicators/db2-health.indicator.ts

import { Injectable, Logger } from "@nestjs/common";
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from "@nestjs/terminus";
import { Db2Service } from "../services/db2.service"; // Importing the Db2Service
import { Db2ConnectionState } from "../enums/db2.enums"; // Importing Db2 connection states

/**
 * @class Db2HealthIndicator
 * @classdesc This class provides health check functionality for the Db2 database service.
 * @public
 */
@Injectable()
export class Db2HealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(Db2HealthIndicator.name);

  constructor(private readonly db2Service: Db2Service) {
    super();
  }

  /**
   * Checks the health of the Db2 connection and returns detailed status.
   * @returns A promise that resolves to a HealthIndicatorResult indicating the health status.
   * @throws HealthCheckError if the health check fails.
   */
  async isHealthy(key: string = "db2"): Promise<HealthIndicatorResult> {
    this.logger.log("Performing Db2 health check...");

    try {
      // Check the current connection state
      const connectionState = this.db2Service.getState();
      if (connectionState !== Db2ConnectionState.CONNECTED) {
        this.logger.warn(
          `Db2 connection state is not CONNECTED: ${connectionState}`
        );
        throw new HealthCheckError(
          "Db2 connection state error",
          this.getStatus(key, false, { connectionState })
        );
      }

      // Perform a health check using the db2Service
      const { dbHealth, transactionActive } =
        await this.db2Service.checkHealth();

      const isHealthy =
        dbHealth && connectionState === Db2ConnectionState.CONNECTED;
      const healthStatus = this.getStatus(key, isHealthy, {
        dbHealth,
        transactionActive,
        connectionState,
      });

      if (!isHealthy) {
        this.logger.warn("Db2 health check failed.", healthStatus);
        throw new HealthCheckError("Db2 health check failed", healthStatus);
      }

      this.logger.log("Db2 is healthy.", healthStatus);
      return healthStatus;
    } catch (error) {
      const healthStatus = this.getStatus(key, false, {
        error: error.message,
      });
      this.logger.error("Db2 health check failed", error.message);
      throw new HealthCheckError(
        `Db2 health check failed: ${error.message}`,
        healthStatus
      );
    }
  }
}
