import { Logger } from '../utils';
import { IMigrationService } from '../interfaces';

export class MigrationService implements IMigrationService {
  private readonly logger = new Logger(MigrationService.name);

  public generateMigrationSQL(
    tableName: string,
    columns: Record<string, string>,
    options?: Record<string, string>,
  ): string {
    return this.generateCreateTableSQL(tableName, columns, options);
  }

  public generateCreateTableSQL(
    tableName: string,
    columns: Record<string, string>,
    options?: Record<string, string>,
  ): string {
    let sql = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n`;
    const columnDefs = Object.entries(columns).map(
      ([columnName, columnType]) => {
        let columnDef = `"${columnName}" ${columnType}`;
        if (options?.[`${columnName}_nullable`] === 'false') {
          columnDef += ' NOT NULL';
        }
        if (options?.[`${columnName}_unique`] === 'true') {
          columnDef += ' UNIQUE';
        }
        if (options?.[`${columnName}_default`]) {
          columnDef += ` DEFAULT '${options[`${columnName}_default`]}'`;
        }
        return columnDef;
      },
    );

    sql += columnDefs.join(',\n');
    sql += `\n);`;

    if (options?.primaryKeys) {
      const primaryKeys = options.primaryKeys
        .split(',')
        .map((key) => `"${key.trim()}"`)
        .join(', ');
      sql += `\nALTER TABLE "${tableName}" ADD PRIMARY KEY (${primaryKeys});`;
    }

    this.logger.info(`Generated CREATE TABLE SQL for ${tableName}: \n${sql}`);
    return sql;
  }

  public generateCreateViewSQL(
    viewName: string,
    viewSQL: string,
    options?: Record<string, string>,
  ): string {
    let sql = `CREATE VIEW "${viewName}" AS ${viewSQL};`;

    this.logger.info(`Generated CREATE VIEW SQL for ${viewName}: \n${sql}`);
    return sql;
  }
}
