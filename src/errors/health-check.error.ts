// src/errors/health-check.error.ts

/**
 * Custom HealthCheckError class to mimic the behavior of @nestjs/terminus HealthCheckError.
 */
export class HealthCheckError extends Error {
  public readonly details: any;

  constructor(message: string, details: any) {
    super(message);
    this.name = 'HealthCheckError';
    this.details = details;
  }
}
