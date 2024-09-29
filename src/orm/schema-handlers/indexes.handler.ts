// src/orm/schema-handlers/indexes.handler.ts

import { Schema } from '../schema';
import { IndexedColumnMetadata } from '../../interfaces';
import { ClassConstructor } from '../../types';

/**
 * Handles index-related operations for a schema.
 */
export class IndexesHandler {
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
   * Defines an index on a column for the current entity.
   * @param propertyKey - The property name in the entity.
   * @param options - Index configuration options.
   * @throws Will throw an error if the entity is not a table or if the property is not valid.
   */
  setIndex(
    propertyKey: string,
    options: Partial<IndexedColumnMetadata> = {},
  ): void {
    if (!this.currentEntity) {
      throw new Error('No entity set for IndexesHandler.');
    }

    // Validate the entity type
    if (!this.schema.isTable(this.currentEntity)) {
      throw new Error(
        `Cannot set index. Entity '${this.schema.getEntityName(this.currentEntity)}' is not a table.`,
      );
    }

    // Validate that the propertyKey exists in the table's columns
    const existingColumns = this.schema
      .getMetadata(this.currentEntity)
      .tableMetadata!.columns.map((col) => col.propertyKey);
    if (!existingColumns.includes(propertyKey)) {
      throw new Error(
        `Cannot set index. Property '${propertyKey}' does not exist in entity '${this.schema.getEntityName(this.currentEntity)}'.`,
      );
    }

    // Prevent duplicate indexes on the same property
    const existingIndexes = this.schema.getMetadata(this.currentEntity)
      .tableMetadata!.indexedColumns;
    if (existingIndexes.some((index) => index.propertyKey === propertyKey)) {
      throw new Error(
        `Index already exists on property '${propertyKey}' in entity '${this.schema.getEntityName(this.currentEntity)}'.`,
      );
    }

    // Construct the index metadata
    const indexMeta: IndexedColumnMetadata = {
      propertyKey,
      name: options.name || `${propertyKey}_idx`, // Default name if not specified
      unique: options.unique || false,
      nullable: options.nullable,
      default: options.default,
      onUpdate: options.onUpdate,
      type: options.type || 'BTREE', // Default to 'BTREE' if not specified
      method: options.method,
      algorithm: options.algorithm,
      parser: options.parser,
      comment: options.comment,
      invisible: options.invisible,
      functional: options.functional,
      expression: options.expression,
      include: options.include,
      prefixLength: options.prefixLength,
    };

    // Push the index metadata to the table metadata of the current entity
    this.schema
      .getMetadata(this.currentEntity)
      .tableMetadata!.indexedColumns.push(indexMeta);
  }
}
