// migration/migration.service.ts

import { Logger } from "@nestjs/common";
import { promises as fs } from "fs";
import { join } from "path";
import {
  Db2ConfigOptions,
  Db2MigrationOptions,
  Db2MigrationServiceInterface,
} from "../interfaces";
import { Db2Client } from "../db";
import { handleDb2Error } from "../errors";
import { EntityMetadataStorage, EntityMetadata } from "../metadata";

export class Db2MigrationService implements Db2MigrationServiceInterface {
  private readonly logger = new Logger(Db2MigrationService.name);
  private migrationConfig: Db2MigrationOptions;
  protected readonly config: Db2ConfigOptions;

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

    if (!this.migrationConfig.runOnStart) {
      this.logger.log(
        "Migrations are not configured to run on start. Skipping migration execution."
      );
      return;
    }

    // Proceed with migration execution
    try {
      await this.executeMigrations();
    } catch (error) {
      handleDb2Error(
        error,
        "Migration process",
        {
          host: this.config.host,
          database: this.config.database,
        },
        this.logger
      );
      throw error;
    }
  }

  /**
   * Executes the migration scripts based on the configuration.
   */
  private async executeMigrations(): Promise<void> {
    try {
      // Load and execute migration files if configured
      const migrationFiles = await this.loadMigrationFiles();
      for (const file of migrationFiles) {
        await this.executeMigrationFile(file);
      }

      // Execute metadata-driven migrations
      const entities = EntityMetadataStorage.getEntities();
      for (const entity of entities) {
        const metadata = EntityMetadataStorage.getEntityMetadata(entity);
        const createTableSQL = this.generateCreateTableSQL(metadata);

        // Execute or log the SQL script as required
        if (this.migrationConfig.dryRun) {
          this.logger.log(
            `Dry run enabled. Migration script not executed: ${createTableSQL}`
          );
        } else {
          try {
            this.logger.log(
              `Executing migration script for table: ${metadata.tableName}`
            );
            await this.db2Client.query(createTableSQL);
            this.logger.log(
              `Migration for table ${metadata.tableName} applied successfully.`
            );
          } catch (error) {
            handleDb2Error(
              error,
              `Migration script for table: ${metadata.tableName}`,
              {
                host: this.config.host,
                database: this.config.database,
              },
              this.logger
            );
            if (this.migrationConfig.skipOnFail) {
              this.logger.warn(
                `Skipping remaining migrations due to error in table: ${metadata.tableName}`
              );
              break;
            } else if (this.migrationConfig.ignoreErrors) {
              this.logger.warn(
                `Ignoring error in migration for table: ${metadata.tableName} and continuing.`
              );
              continue;
            } else {
              throw error;
            }
          }
        }
      }
    } catch (error) {
      handleDb2Error(
        error,
        "Migration process",
        {
          host: this.config.host,
          database: this.config.database,
        },
        this.logger
      );
      throw error;
    }
  }

  /**
   * Generates the SQL script for creating a table based on entity metadata.
   */
  private generateCreateTableSQL(metadata: EntityMetadata): string {
    let sql = `CREATE TABLE ${metadata.tableName} (`;

    // Define columns
    const columnDefinitions = metadata.columns.map((column) => {
      let columnDef = `${String(
        column.propertyKey
      )} ${column.type.toUpperCase()}`;
      if (column.length) columnDef += `(${column.length})`;
      if (column.nullable === false) columnDef += ` NOT NULL`;
      if (
        metadata.defaultValues.some(
          (def) => def.propertyKey === column.propertyKey
        )
      ) {
        const defaultValue = metadata.defaultValues.find(
          (def) => def.propertyKey === column.propertyKey
        ).value;
        columnDef += ` DEFAULT ${defaultValue}`;
      }
      return columnDef;
    });

    sql += columnDefinitions.join(", ");

    // Define primary keys
    if (metadata.primaryKeys.length) {
      sql += `, PRIMARY KEY (${metadata.primaryKeys.join(", ")})`;
    }

    // Define unique constraints
    if (metadata.uniqueColumns.length) {
      metadata.uniqueColumns.forEach((uniqueColumn) => {
        sql += `, UNIQUE (${uniqueColumn})`;
      });
    }

    // Define foreign keys
    if (metadata.foreignKeys.length) {
      metadata.foreignKeys.forEach((fk) => {
        sql += `, FOREIGN KEY (${String(fk.propertyKey)}) REFERENCES ${
          fk.reference
        }`;
        if (fk.onDelete) {
          sql += ` ON DELETE ${fk.onDelete}`;
        }
      });
    }

    // Define check constraints
    if (metadata.checkConstraints.length) {
      metadata.checkConstraints.forEach((check) => {
        sql += `, CHECK (${check.constraint})`;
      });
    }

    sql += ");";

    // Define indexes
    if (metadata.indexedColumns.length) {
      metadata.indexedColumns.forEach((indexedColumn) => {
        sql += ` CREATE INDEX idx_${metadata.tableName}_${String(
          indexedColumn
        )} ON ${metadata.tableName} (${String(indexedColumn)});`;
      });
    }

    return sql;
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
          host: this.config.host,
          database: this.config.database,
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
   * Executes a migration file.
   */
  private async executeMigrationFile(file: string): Promise<void> {
    if (
      this.migrationConfig.ignoreExecuted &&
      this.migrationConfig.tableName &&
      (await this.isMigrationExecuted(file))
    ) {
      this.logger.log(`Skipping executed migration: ${file}`);
      return;
    }

    const script = await fs.readFile(file, "utf-8");

    if (this.migrationConfig.dryRun) {
      this.logger.log(
        `Dry run enabled. Migration script not executed: ${file}`
      );
      return;
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
          host: this.config.host,
          database: this.config.database,
        },
        this.logger
      );

      if (this.migrationConfig.skipOnFail) {
        this.logger.warn(
          `Skipping remaining migrations due to error in: ${file}`
        );
      } else if (this.migrationConfig.ignoreErrors) {
        this.logger.warn(
          `Ignoring error in migration: ${file} and continuing.`
        );
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

    const sql = `SELECT COUNT(*) AS count FROM ${this.migrationConfig.tableName} WHERE migration_file = ?`;

    try {
      const result = await this.db2Client.query<{ count: number }>(sql, [file]);
      return result.count > 0;
    } catch (error) {
      handleDb2Error(
        error,
        "Checking if migration is executed",
        {
          host: this.config.host,
          database: this.config.database,
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

    const sql = `INSERT INTO ${this.migrationConfig.tableName} (migration_file) VALUES (?)`;

    try {
      await this.db2Client.query(sql, [file]);
      this.logger.log(`Migration marked as executed: ${file}`);
    } catch (error) {
      handleDb2Error(
        error,
        "Marking migration as executed",
        {
          host: this.config.host,
          database: this.config.database,
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
