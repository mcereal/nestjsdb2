// src/interfaces/db2-migration-service.interface.ts

export interface Db2MigrationServiceInterface {
  /**
   * Runs database migrations based on the configuration.
   */
  runMigrations(): Promise<void>;
}
