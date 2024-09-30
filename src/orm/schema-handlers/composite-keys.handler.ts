// src/orm/schema-handlers/composite-keys.handler.ts

import { Schema } from '../schema';
import { CompositeKeyMetadata } from '../interfaces';
import { ClassConstructor } from '../types';

/**
 * Handles composite key-related operations for a schema.
 * @noInheritDoc
 * @internal
 * @hidden
 * @ignore
 * @since 1.1.9
 * @category SchemaHandlers
 * @template Entity - The entity class type.
 *
 * @example
 * ```ts
 * const compositeKeysHandler = new CompositeKeysHandler(schema);
 * ```
 */
export class CompositeKeysHandler {
  private currentEntity!: ClassConstructor<any>;

  constructor(private schema: Schema<any>) {}

  /**
   * Sets the entity on which the handler will operate.
   * @param entity - The entity class constructor.
   * @throws Will throw an error if setting the entity fails.
   *
   * @example
   * ```ts
   * compositeKeysHandler.setEntity(User);
   * ```
   */
  setEntity(entity: ClassConstructor<any>): void {
    try {
      this.currentEntity = entity;
    } catch (error) {
      throw new Error(`Failed to set entity: ${error.message}`);
    }
  }

  /**
   * Defines a composite key on columns for the current entity.
   * @param propertyKeys - The property names in the entity.
   * @param options - Optional configurations for the composite key.
   * @throws Will throw an error if the entity is not a table, if property keys are invalid, or if setting the composite key fails.
   *
   * @example
   * ```ts
   * compositeKeysHandler.setCompositeKey(['firstName', 'lastName'], { name: 'name_key' });
   * ```
   */
  setCompositeKey(
    propertyKeys: string[],
    options: Partial<CompositeKeyMetadata> = {},
  ): void {
    try {
      if (!this.currentEntity) {
        throw new Error('No entity set for CompositeKeysHandler.');
      }

      if (!this.schema.isTable(this.currentEntity)) {
        throw new Error(
          `Cannot set composite key. Entity '${this.schema.getEntityName(this.currentEntity)}' is not a table.`,
        );
      }

      // Validate propertyKeys
      if (!propertyKeys || propertyKeys.length === 0) {
        throw new Error(
          'Composite key must be defined with at least one column.',
        );
      }

      // Ensure all property keys exist in the table columns
      const metadata = this.schema.getMetadata(this.currentEntity);
      const existingColumns = metadata.tableMetadata!.columns.map(
        (col) => col.propertyKey,
      );
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
        ...options,
      };

      // Push the composite key metadata to the table metadata in the schema
      metadata.tableMetadata!.compositeKeys.push(compositeKeyMeta);
    } catch (error) {
      throw new Error(`Failed to set composite key: ${error.message}`);
    }
  }
}
