// src/orm/schema-handlers/columns.handler.ts

import { Schema } from '../schema';
import { ColumnMetadata } from '../../interfaces';
import { ClassConstructor } from '../../types';

/**
 * Handles column-related operations for a schema.
 */
export class ColumnsHandler {
  private currentEntity!: ClassConstructor<any>;

  constructor(private schema: Schema<any>) {}

  /**
   * Sets the entity on which the handler will operate.
   * @param entity - The entity class constructor.
   */
  setEntity(entity: ClassConstructor<any>): void {
    this.currentEntity = entity;
  }

  /**
   * Adds a new column to the specified entity's table schema.
   * @param propertyKey - The property name in the entity.
   * @param options - Column configuration options.
   * @throws Will throw an error if the entity is not a table.
   */
  addColumn(propertyKey: string, options: ColumnMetadata): void {
    if (!this.currentEntity) {
      throw new Error('No entity set for ColumnsHandler.');
    }

    if (!this.schema.isTable(this.currentEntity)) {
      throw new Error(
        `Cannot add column. Entity '${this.schema.getEntityName(this.currentEntity)}' is not a table.`,
      );
    }

    const metadata = this.schema.getMetadata(this.currentEntity);
    const columnMeta: ColumnMetadata = {
      propertyKey,
      type: options.type || 'string', // Default type if not specified
      ...options,
    };

    // Add column metadata to the entity's table metadata
    metadata.tableMetadata!.columns.push(columnMeta);

    // Handle primary key
    if (options.primary) {
      metadata.tableMetadata!.primaryKeys.push({
        propertyKey,
        ...options,
      });
    }

    // Handle unique index
    if (options.unique) {
      metadata.tableMetadata!.indexedColumns.push({
        propertyKey,
        name: `${propertyKey}_unique`,
        unique: true,
        type: 'BTREE', // Default index type
        // Additional index options can be added here
      });
    }

    // Handle default values
    if (options.default !== undefined) {
      metadata.tableMetadata!.defaultValues.push({
        propertyKey,
        value: options.default,
      });
    }

    // Add more column-related configurations as needed
  }

  // You can add more methods for modifying or removing columns
}
