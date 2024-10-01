export interface IMigrationService {
  generateMigrationSQL(
    tableName: string,
    columns: Record<string, string>,
    options?: Record<string, string>,
  ): string;

  generateCreateTableSQL(
    tableName: string,
    columns: Record<string, string>,
    options?: Record<string, string>,
  ): string;

  generateCreateViewSQL(
    viewName: string,
    viewSQL: string,
    options?: Record<string, string>,
  ): string;
}
