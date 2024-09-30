import { Injectable } from '@nestjs/common';
import { IConnectionManager } from '../interfaces';
import { Db2ConnectionState } from '../enums';
import { HealthCheckError } from '../errors/health-check.error';
import { Logger } from '../utils';

/**
 * @class Db2HealthIndicator
 * @classdesc This class provides health check functionality for the Db2 database service using the ConnectionManager.
 * @public
 */
@Injectable()
export class Db2HealthIndicator {
  private readonly logger = new Logger(Db2HealthIndicator.name);

  constructor(private readonly connectionManager: IConnectionManager) {}

  /**
   * Checks the health of the Db2 connection and returns detailed status.
   * @param key Optional key name for the health indicator.
   * @returns A promise that resolves to a health status object indicating the health status.
   * @throws HealthCheckError if the health check fails.
   */
  async checkHealth(key = 'db2'): Promise<Record<string, any>> {
    this.logger.info('Performing Db2 health check...');

    try {
      // Check the current connection state using the ConnectionManager
      const { connectionState } = this.connectionManager.getState();
      if (connectionState !== Db2ConnectionState.CONNECTED) {
        this.logger.warn(
          `Db2 connection state is not CONNECTED: ${connectionState}`,
        );
        const healthStatus = this.formatStatus(key, false, { connectionState });
        throw new HealthCheckError('Db2 connection state error', healthStatus);
      }

      // Perform a health check using the ConnectionManager
      const { status: dbHealth, details: healthDetails } =
        await this.connectionManager.checkHealth();

      const isHealthy =
        dbHealth && connectionState === Db2ConnectionState.CONNECTED;
      const healthStatus = this.formatStatus(key, isHealthy, {
        ...healthDetails,
        connectionState,
      });

      if (!isHealthy) {
        this.logger.warn('Db2 health check failed.', healthStatus);
        throw new HealthCheckError('Db2 health check failed', healthStatus);
      }

      this.logger.info('Db2 is healthy.', healthStatus);
      return healthStatus;
    } catch (error) {
      const healthStatus = this.formatStatus(key, false, {
        error: error.message,
      });
      this.logger.error('Db2 health check failed', error.message);
      throw new HealthCheckError(
        `Db2 health check failed: ${error.message}`,
        healthStatus,
      );
    }
  }

  /**
   * Utility method to format the health status.
   * @param key The key name for the health indicator.
   * @param isHealthy The health status.
   * @param details Additional details about the health status.
   * @returns A formatted health status object.
   */
  private formatStatus(
    key: string,
    isHealthy: boolean,
    details: Record<string, any>,
  ): Record<string, any> {
    return {
      [key]: {
        status: isHealthy ? 'up' : 'down',
        ...details,
      },
    };
  }
}
