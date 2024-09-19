// src/interfaces/db2-migration-service.interface.ts

export interface IDb2MigrationService {
  /**
   * Runs database migrations based on the configuration.
   */
  runMigrations(): Promise<void>;
}
