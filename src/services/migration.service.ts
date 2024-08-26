// src/migration/migration.service.ts

import { Logger } from "@nestjs/common";
import { promises as fs } from "fs";
import { join } from "path";
import {
  Db2MigrationOptions,
  Db2MigrationServiceInterface,
} from "../interfaces";
import { Db2Client } from "../db";
import { handleDb2Error } from "../errors";

export class Db2MigrationService implements Db2MigrationServiceInterface {
  private readonly logger = new Logger(Db2MigrationService.name);
  private migrationConfig: Db2MigrationOptions;

  public constructor(
    private db2Client: Db2Client,
    migrationConfig: Db2MigrationOptions
  ) {
    this.migrationConfig = migrationConfig;
  }

  /**
   * Runs database migrations based on the configuration.
   */
  public async runMigrations(): Promise<void> {
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
        if (
          this.migrationConfig.ignoreExecuted &&
          this.migrationConfig.tableName &&
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
          handleDb2Error(
            error,
            `Migration script: ${file}`,
            {
              host: this.db2Client.getHost(),
              database: this.db2Client.getDatabase(),
            },
            this.logger
          );

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
      handleDb2Error(
        error,
        "Migration process",
        {
          host: this.db2Client.getHost(),
          database: this.db2Client.getDatabase(),
        },
        this.logger
      );
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
      handleDb2Error(
        error,
        "Loading migration files",
        {
          host: this.db2Client.getHost(),
          database: this.db2Client.getDatabase(),
        },
        this.logger
      );

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
      handleDb2Error(
        error,
        "Checking if migration is executed",
        {
          host: this.db2Client.getHost(),
          database: this.db2Client.getDatabase(),
        },
        this.logger
      );

      if (this.migrationConfig.ignoreErrors) {
        this.logger.warn(
          `Ignoring error and continuing. Error: ${error.message}`
        );
        return false;
      }
      throw error;
    }
  }

  /**
   * Marks a migration file as executed in the tracking table.
   */
  private async markMigrationAsExecuted(file: string): Promise<void> {
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
      handleDb2Error(
        error,
        "Marking migration as executed",
        {
          host: this.db2Client.getHost(),
          database: this.db2Client.getDatabase(),
        },
        this.logger
      );

      if (this.migrationConfig.ignoreErrors) {
        this.logger.warn(
          `Ignoring error and continuing. Error: ${error.message}`
        );
        return;
      }
      throw error;
    }
  }
}
