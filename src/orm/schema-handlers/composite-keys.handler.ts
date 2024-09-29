// src/orm/schema-handlers/composite-keys.handler.ts

import { Schema } from '../schema';
import { CompositeKeyMetadata } from '../../interfaces';

/**
 * Handles composite key-related operations for a schema.
 */
export class CompositeKeysHandler<T> {
  constructor(private schema: Schema<T>) {}

  /**
   * Defines a composite key on columns.
   * @param propertyKeys - The property names in the entity.
   * @param options - Optional configurations for the composite key.
   */
  setCompositeKey(
    propertyKeys: string[],
    options: Partial<CompositeKeyMetadata> = {},
  ): void {
    if (!this.schema.isTable()) {
      throw new Error(
        `Cannot set composite key. Entity '${this.schema.getEntityName()}' is not a table.`,
      );
    }

    // Validate propertyKeys
    if (!propertyKeys || propertyKeys.length === 0) {
      throw new Error(
        'Composite key must be defined with at least one column.',
      );
    }

    // Ensure all property keys exist in the table columns
    const existingColumns = this.schema
      .getMetadata()
      .tableMetadata!.columns.map((col) => col.propertyKey);
    const invalidKeys = propertyKeys.filter(
      (key) => !existingColumns.includes(key),
    );
    if (invalidKeys.length > 0) {
      throw new Error(
        `Invalid composite key properties: ${invalidKeys.join(', ')}. Make sure all keys are valid table columns.`,
      );
    }

    // Construct composite key metadata
    const compositeKeyMeta: CompositeKeyMetadata = {
      keys: propertyKeys,
      name: options.name || `composite_${propertyKeys.join('_')}`,
      unique: options.unique,
      nullable: options.nullable,
      default: options.default,
      onUpdate: options.onUpdate,
    };

    // Push the composite key metadata to the table metadata in the schema
    this.schema
      .getMetadata()
      .tableMetadata!.compositeKeys.push(compositeKeyMeta);
  }
}
