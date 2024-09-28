// src/orm/model.ts
import { Db2Service } from '../services';
import { Schema } from './schema';

export class Model<T> {
  private schema: Schema;

  constructor(
    private db2Service: Db2Service,
    schema: Schema,
  ) {
    this.schema = schema;
  }

  // Create a new instance of the model with validation and default values
  create(data: Partial<T>): T {
    const metadata = this.schema.getMetadata();
    if (!metadata.tableMetadata)
      throw new Error('Invalid schema metadata for model.');

    const instance = {} as T;

    // Initialize columns with data, defaults, and validation
    for (const column of metadata.tableMetadata.columns) {
      const { propertyKey, default: defaultValue } = column;
      const value = data[propertyKey as keyof T];

      if (value !== undefined) {
        // Use provided value
        instance[propertyKey as keyof T] = value;
      } else if (defaultValue !== undefined) {
        // Set default value if not provided
        instance[propertyKey as keyof T] = defaultValue;
      } else {
        // Handle required columns or constraints
        if (column.nullable === false) {
          throw new Error(`Property ${String(propertyKey)} is required.`);
        }
      }
    }
    return instance;
  }

  // Save the instance to the database
  async save(instance: T): Promise<void> {
    const metadata = this.schema.getMetadata();
    const tableName = metadata.tableMetadata?.tableName;
    if (!tableName) throw new Error('Table name is not defined in the schema.');

    // Generate an INSERT SQL statement using the schema's metadata
    const columns = metadata.tableMetadata.columns;
    const columnNames = columns.map((col) => col.propertyKey).join(', ');
    const values = columns
      .map((col) => {
        const value = (instance as any)[col.propertyKey];
        return value !== undefined ? `'${value}'` : 'NULL';
      })
      .join(', ');

    const sql = `INSERT INTO ${tableName} (${columnNames}) VALUES (${values})`;
    console.log(`Executing SQL: ${sql}`);

    // Use Db2Service to execute the SQL
    await this.db2Service.query(sql);
  }

  // Query methods like find, findOne, update, delete
  async find(query: Partial<T>): Promise<T[]> {
    const metadata = this.schema.getMetadata();
    const tableName = metadata.tableMetadata?.tableName;
    if (!tableName) throw new Error('Table name is not defined in the schema.');

    // Generate SELECT SQL using the schema's metadata and the query
    const whereClause = this.generateWhereClause(query);
    const sql = `SELECT * FROM ${tableName} ${whereClause}`;
    console.log(`Executing SQL: ${sql}`);

    // Use Db2Service to execute the SQL and return the result
    return this.db2Service.query<T[]>(sql);
  }

  async findOne(query: Partial<T>): Promise<T | null> {
    const results = await this.find(query);
    return results.length > 0 ? results[0] : null;
  }

  async update(query: Partial<T>, data: Partial<T>): Promise<void> {
    const metadata = this.schema.getMetadata();
    const tableName = metadata.tableMetadata?.tableName;
    if (!tableName) throw new Error('Table name is not defined in the schema.');

    // Generate UPDATE SQL using the schema's metadata
    const setClause = Object.keys(data)
      .map((key) => `${key} = '${(data as any)[key]}'`)
      .join(', ');
    const whereClause = this.generateWhereClause(query);
    const sql = `UPDATE ${tableName} SET ${setClause} ${whereClause}`;
    console.log(`Executing SQL: ${sql}`);

    // Use Db2Service to execute the SQL
    await this.db2Service.query(sql);
  }

  async delete(query: Partial<T>): Promise<void> {
    const metadata = this.schema.getMetadata();
    const tableName = metadata.tableMetadata?.tableName;
    if (!tableName) throw new Error('Table name is not defined in the schema.');

    // Generate DELETE SQL using the schema's metadata
    const whereClause = this.generateWhereClause(query);
    const sql = `DELETE FROM ${tableName} ${whereClause}`;
    console.log(`Executing SQL: ${sql}`);

    // Use Db2Service to execute the SQL
    await this.db2Service.query(sql);
  }

  // Utility method to generate a WHERE clause for SQL queries
  private generateWhereClause(query: Partial<T>): string {
    const conditions = Object.keys(query)
      .map((key) => `${key} = '${(query as any)[key]}'`)
      .join(' AND ');
    return conditions ? `WHERE ${conditions}` : '';
  }
}
