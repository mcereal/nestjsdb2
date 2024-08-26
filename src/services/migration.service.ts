// src/migration/migration.service.ts

import { Logger } from "@nestjs/common";
import { promises as fs } from "fs";
import { join } from "path";
import { Db2MigrationOptions } from "../interfaces/db2.interface";
import { formatDb2Error } from "../utils/db2.utils";
import { Db2Client } from "src/db/db2-client";

export class Db2MigrationService {
  private readonly logger = new Logger(Db2MigrationService.name);
  private migrationConfig: Db2MigrationOptions;

  constructor(
    private db2Client: Db2Client,
    migrationConfig: Db2MigrationOptions
  ) {
    this.migrationConfig = migrationConfig;
  }

  /**
   * Runs database migrations based on the configuration.
   */
  async runMigrations(): Promise<void> {
    if (!this.migrationConfig.enabled) {
      this.logger.warn(
        "Migrations are disabled. Skipping migration execution."
      );
      return;
    }

    if (this.migrationConfig.runOnStart) {
      await this.executeMigrations();
    }
  }

  /**
   * Executes the migration scripts based on the configuration.
   */
  private async executeMigrations(): Promise<void> {
    try {
      const migrationFiles = await this.loadMigrationFiles();

      for (const file of migrationFiles) {
        // Check if migration should be ignored
        if (
          this.migrationConfig.ignoreExecuted &&
          this.migrationConfig.tableName && // Check only if tableName is defined
          (await this.isMigrationExecuted(file))
        ) {
          this.logger.log(`Skipping executed migration: ${file}`);
          continue;
        }

        const script = await fs.readFile(file, "utf-8");

        if (this.migrationConfig.dryRun) {
          this.logger.log(
            `Dry run enabled. Migration script not executed: ${file}`
          );
          continue;
        }

        try {
          if (this.migrationConfig.logQueries) {
            this.logger.log(`Executing migration script: ${file}`);
          }

          await this.db2Client.query(script);

          if (
            this.migrationConfig.markAsExecuted &&
            this.migrationConfig.tableName
          ) {
            await this.markMigrationAsExecuted(file);
          }

          this.logger.log(`Migration applied successfully: ${file}`);
        } catch (error) {
          if (this.migrationConfig.logErrors) {
            formatDb2Error(
              error,
              `Migration script: ${file}`,
              { file },
              this.logger
            );
          }

          if (this.migrationConfig.skipOnFail) {
            this.logger.warn(
              `Skipping remaining migrations due to error in: ${file}`
            );
            break;
          } else if (this.migrationConfig.ignoreErrors) {
            this.logger.warn(
              `Ignoring error in migration: ${file} and continuing.`
            );
            continue;
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      formatDb2Error(error, "Migration process", {}, this.logger);
      throw error;
    }
  }

  /**
   * Load migration files from the configured directory.
   */
  private async loadMigrationFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.migrationConfig.migrationDir);
      return files
        .filter((file) => file.endsWith(this.migrationConfig.fileExtension))
        .map((file) => join(this.migrationConfig.migrationDir, file));
    } catch (error) {
      const formattedError = formatDb2Error(error, "Loading migration files");
      if (this.migrationConfig.logErrors) {
        this.logger.error(formattedError);
      }

      if (this.migrationConfig.ignoreMissing) {
        this.logger.warn(
          "Ignoring missing migration files due to configuration."
        );
        return [];
      } else {
        throw error;
      }
    }
  }

  /**
   * Checks if a migration file has already been executed.
   */
  private async isMigrationExecuted(file: string): Promise<boolean> {
    // Return false if tableName is not provided
    if (!this.migrationConfig.tableName) {
      return false;
    }

    const sql = `
        SELECT COUNT(*) AS count 
        FROM ${this.migrationConfig.tableName} 
        WHERE migration_file = ?
    `;

    try {
      const result = await this.db2Client.query<{ count: number }>(sql, [file]);
      return result.count > 0;
    } catch (error) {
      const formattedError = formatDb2Error(
        error,
        "Checking if migration is executed"
      );
      this.logger.error(formattedError);
      if (this.migrationConfig.ignoreErrors) {
        this.logger.warn(
          `Ignoring error and continuing. Error: ${formattedError}`
        );
        return false;
      }
      throw new Error(formattedError);
    }
  }

  /**
   * Marks a migration file as executed in the tracking table.
   */
  private async markMigrationAsExecuted(file: string): Promise<void> {
    // Do nothing if tableName is not provided
    if (!this.migrationConfig.tableName) {
      return;
    }

    const sql = `
        INSERT INTO ${this.migrationConfig.tableName} (migration_file) 
        VALUES (?)
    `;

    try {
      await this.db2Client.query(sql, [file]);
      this.logger.log(`Migration marked as executed: ${file}`);
    } catch (error) {
      const formattedError = formatDb2Error(
        error,
        "Marking migration as executed"
      );
      this.logger.error(formattedError);
      if (this.migrationConfig.ignoreErrors) {
        this.logger.warn(
          `Ignoring error and continuing. Error: ${formattedError}`
        );
        return;
      }
      throw new Error(formattedError);
    }
  }
}
