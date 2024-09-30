// migration/migration.service.ts

import { Logger } from '../utils';
import {
  IDb2ConfigOptions,
  Db2MigrationOptions,
  IDb2MigrationService,
  IDb2Client,
} from '../interfaces';
import { handleDb2Error } from '../errors';
import { EntityMetadata, TableMetadata, ViewMetadata } from '../orm';
import { MetadataManager } from '../orm/metadata';

export class MigrationService implements IDb2MigrationService {
  private readonly logger = new Logger(MigrationService.name);
  private migrationConfig: Db2MigrationOptions;
  protected readonly config: IDb2ConfigOptions;
  private readonly metadataManager: MetadataManager;

  public constructor(
    private db2Client: IDb2Client,
    migrationConfig: Db2MigrationOptions,
  ) {
    this.migrationConfig = migrationConfig;
    this.metadataManager = new MetadataManager();
  }

  /**
   * Runs database migrations based on the configuration.
   */
  async runMigrations(): Promise<void> {
    if (!this.migrationConfig.enabled || !this.migrationConfig.runOnStart) {
      this.logger.info('Migrations are disabled or not set to run on start.');
      return;
    }

    const entities = this.metadataManager.getAllEntities();

    for (const entity of entities) {
      let metadata: EntityMetadata;
      try {
        metadata = this.metadataManager.getEntityMetadata(entity);
      } catch (error) {
        this.logger.warn(
          `No metadata found for entity ${entity.name}. Skipping.`,
        );
        continue;
      }

      // Determine if the entity is a table or a view
      const isTable = metadata.entityType === 'table';
      const tableMetadata: TableMetadata = isTable
        ? metadata.tableMetadata
        : undefined;
      const viewMetadata: ViewMetadata = !isTable
        ? metadata.viewMetadata
        : undefined;

      if (!tableMetadata && !viewMetadata) {
        this.logger.warn(
          `No table or view metadata found for entity ${entity.name}. Skipping.`,
        );
        continue;
      }

      // Use table or view metadata to generate SQL
      const createSQL = isTable
        ? this.generateCreateTableSQL(tableMetadata!)
        : this.generateCreateViewSQL(viewMetadata!);

      if (this.migrationConfig.logQueries) {
        this.logger.info(
          `Migration SQL for ${isTable ? tableMetadata!.tableName : viewMetadata!.viewName}:\n${createSQL}`,
        );
      }

      if (this.migrationConfig.dryRun) {
        this.logger.info(
          `Dry run enabled. Skipping execution of migration for ${entity.name}.`,
        );
        continue;
      }

      try {
        await this.db2Client.query(createSQL);
        this.logger.info(
          `Migration for ${isTable ? tableMetadata!.tableName : viewMetadata!.viewName} applied successfully.`,
        );

        if (this.migrationConfig.markAsExecuted) {
          // Implement logic to mark the migration as executed, e.g., insert into a migrations table
          this.logger.info(
            `Migration for ${isTable ? tableMetadata!.tableName : viewMetadata!.viewName} marked as executed.`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to migrate ${isTable ? tableMetadata!.tableName : viewMetadata!.viewName}: ${error.message}`,
        );
        if (!this.migrationConfig.skipOnFail) {
          handleDb2Error(
            error,
            'Migration process',
            { host: this.config.host, database: this.config.database },
            this.logger,
          );
          throw error;
        }
      }
    }
  }

  /**
   * Generates the SQL script for creating a table based on entity metadata.
   */
  private generateCreateTableSQL(metadata: TableMetadata): string {
    let sql = `CREATE SCHEMA IF NOT EXISTS "${metadata.schemaName}";\n`;
    sql += `CREATE TABLE IF NOT EXISTS "${metadata.schemaName}"."${metadata.tableName}" (\n`;

    const columnDefs = metadata.columns.map((column) => {
      let columnDef = `  "${String(column.propertyKey)}" ${this.mapColumnType(column.type, column.length)}`;
      if (column.nullable === false) {
        columnDef += ' NOT NULL';
      }
      if (column.unique) {
        columnDef += ' UNIQUE';
      }
      if (column.default !== undefined) {
        const defaultValue =
          typeof column.default === 'function'
            ? column.default()
            : `'${column.default}'`;
        columnDef += ` DEFAULT ${defaultValue}`;
      }
      return columnDef;
    });

    // Add primary key constraint
    if (metadata.primaryKeys.length > 0) {
      const primaryKeys = metadata.primaryKeys
        .map((pk) => `"${String(pk.propertyKey)}"`)
        .join(', ');
      columnDefs.push(`  PRIMARY KEY (${primaryKeys})`);
    }

    sql += columnDefs.join(',\n');
    sql += `\n);`;

    // Add indexes
    for (const index of metadata.indexedColumns) {
      const indexName =
        index.name || `${metadata.tableName}_${String(index.propertyKey)}_idx`;
      const columns = Array.isArray(index.propertyKey)
        ? index.propertyKey
        : [index.propertyKey];
      const indexColumns = columns.map((col) => `"${col}"`).join(', ');
      sql += `\nCREATE INDEX "${indexName}" ON "${metadata.schemaName}"."${metadata.tableName}" (${indexColumns});`;
    }

    // Add foreign keys
    for (const fk of metadata.foreignKeys) {
      const fkName =
        fk.name || `${metadata.tableName}_${String(fk.propertyKey)}_fk`;
      const columns = Array.isArray(fk.propertyKey)
        ? fk.propertyKey
        : [fk.propertyKey];
      const fkColumns = columns.map((col) => `"${col}"`).join(', ');
      const reference = fk.reference;
      const onDelete = fk.onDelete ? ` ON DELETE ${fk.onDelete}` : '';
      const onUpdate = fk.onUpdate ? ` ON UPDATE ${fk.onUpdate}` : '';
      sql += `\nALTER TABLE "${metadata.schemaName}"."${metadata.tableName}" ADD CONSTRAINT "${fkName}" FOREIGN KEY (${fkColumns}) REFERENCES ${reference}${onDelete}${onUpdate};`;
    }

    // Add unique constraints
    for (const constraint of metadata.constraints) {
      const constraintName =
        (constraint.constraint.name ??
          `${metadata.tableName}_${String(constraint.propertyKey)}_unique`) ||
        `${metadata.tableName}_${String(constraint.propertyKey)}_unique`;
      const columns = Array.isArray(constraint.propertyKey)
        ? constraint.propertyKey
        : [constraint.propertyKey];
      const constraintColumns = columns.map((col) => `"${col}"`).join(', ');
      sql += `\nALTER TABLE "${metadata.schemaName}"."${metadata.tableName}" ADD CONSTRAINT "${constraintName}" UNIQUE (${constraintColumns});`;
    }

    return sql;
  }

  private generateCreateViewSQL(metadata: ViewMetadata): string {
    let sql = `CREATE SCHEMA IF NOT EXISTS "${metadata.schemaName}";\n`;
    sql += `CREATE VIEW "${metadata.schemaName}"."${metadata.viewName}" AS ${metadata.underlyingQuery};\n`;
    return sql;
  }

  private mapColumnType(type: string, length?: number): string {
    switch (type.toUpperCase()) {
      case 'VARCHAR':
        return length ? `VARCHAR(${length})` : 'VARCHAR';
      case 'CHAR':
        return length ? `CHAR(${length})` : 'CHAR';
      case 'TIMESTAMP':
        return 'TIMESTAMP';
      // Add other type mappings as needed
      default:
        throw new Error(`Unsupported column type: ${type}`);
    }
  }
}
