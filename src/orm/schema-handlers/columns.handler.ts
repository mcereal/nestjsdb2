// src/orm/schema-handlers/columns.handler.ts

import { Schema } from '../schema';
import { ColumnMetadata } from '../../interfaces';

/**
 * Handles column-related operations for a schema.
 */
export class ColumnsHandler<T> {
  constructor(private schema: Schema<T>) {}

  /**
   * Adds a new column to the table schema.
   * @param propertyKey - The property name in the entity.
   * @param options - Column configuration options.
   * @throws Will throw an error if the entity is not a table.
   */
  addColumn(propertyKey: string, options: ColumnMetadata): void {
    if (!this.schema.isTable()) {
      throw new Error(
        `Cannot add column. Entity '${this.schema.getEntityName()}' is not a table.`,
      );
    }
    const columnMeta: ColumnMetadata = {
      propertyKey,
      type: options.type || 'string', // Default type if not specified
      ...options,
    };
    this.schema.getMetadata().tableMetadata!.columns.push(columnMeta);

    // Handle primary key
    if (options.primary) {
      this.schema.getMetadata().tableMetadata!.primaryKeys.push({
        propertyKey,
        ...options,
      });
    }

    // Handle unique index
    if (options.unique) {
      this.schema.getMetadata().tableMetadata!.indexedColumns.push({
        propertyKey,
        name: `${propertyKey}_unique`,
        unique: true,
        type: 'BTREE', // Default index type
        // Additional index options can be added here
      });
    }

    // Handle default values
    if (options.default !== undefined) {
      this.schema.getMetadata().tableMetadata!.defaultValues.push({
        propertyKey,
        value: options.default,
      });
    }

    // Add more column-related configurations as needed
  }

  // You can add more methods for modifying or removing columns
}
