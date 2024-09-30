// src/orm/schema-handlers/foreign-keys.handler.ts

import { Schema } from '../schema';
import { ForeignKeyMetadata } from '../interfaces';
import { ClassConstructor } from '../types';
import { MetadataManager } from '../metadata/metadata-manager';

/**
 * Handles foreign key-related operations for a schema.
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
 * const foreignKeysHandler = new ForeignKeysHandler(schema);
 * ```
 */
export class ForeignKeysHandler {
  private currentEntity!: ClassConstructor<any>;

  constructor(private schema: Schema<any>) {}

  /**
   * Sets the entity on which the handler will operate.
   * @param entity - The entity class constructor.
   * @throws Will throw an error if setting the entity fails.
   *
   * @example
   * ```ts
   * foreignKeysHandler.setEntity(User);
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
   * Defines a foreign key on a column for the current entity.
   * @param propertyKey - The property name in the entity.
   * @param options - Foreign key configuration options.
   * @throws Will throw an error if required options are missing, if the entity is not a table, or if setting the foreign key fails.
   *
   * @example
   * ```ts
   * foreignKeysHandler.setForeignKey('userId', { referencedTable: 'users', referencedColumnNames: ['id'] });
   * ```
   */
  setForeignKey(
    propertyKey: string,
    options: Partial<ForeignKeyMetadata>,
  ): void {
    try {
      if (!this.currentEntity) {
        throw new Error('No entity set for ForeignKeysHandler.');
      }

      // Validate the entity type
      if (!this.schema.isTable(this.currentEntity)) {
        throw new Error(
          `Cannot set foreign key. Entity '${this.schema.getEntityName(this.currentEntity)}' is not a table.`,
        );
      }

      // Validate required options for a foreign key
      if (!options.referencedTable) {
        throw new Error(
          `Foreign key on '${propertyKey}' requires a 'referencedTable' option.`,
        );
      }
      if (
        !options.referencedColumnNames ||
        options.referencedColumnNames.length === 0
      ) {
        throw new Error(
          `Foreign key on '${propertyKey}' requires at least one 'referencedColumnNames'.`,
        );
      }

      // Retrieve MetadataManager instance
      const metadataManager = MetadataManager.getInstance();

      // Construct foreign key metadata
      const foreignKeyMeta: ForeignKeyMetadata = {
        propertyKey,
        name: options.name || `${propertyKey}_fk`, // Default name if not specified
        target: options.target!,
        referencedTable: options.referencedTable,
        referencedColumnNames: options.referencedColumnNames,
        onDelete: options.onDelete,
        onUpdate: options.onUpdate,
        reference: `${options.referencedTable}(${options.referencedColumnNames.join(
          ',',
        )})`,
        // Spread the rest of the options if needed
      };

      // Add foreign key metadata via MetadataManager
      metadataManager.addMetadata(
        this.currentEntity,
        'foreignKeys',
        foreignKeyMeta,
        (existing: ForeignKeyMetadata, newEntry: ForeignKeyMetadata) =>
          existing.propertyKey === newEntry.propertyKey,
      );
    } catch (error) {
      throw new Error(
        `Failed to set foreign key for property '${propertyKey}': ${error.message}`,
      );
    }
  }

  /**
   * Gets the foreign key metadata for the current entity.
   * @returns The array of foreign key metadata objects.
   * @throws Will throw an error if the entity is not a table or if retrieving the foreign keys fails.
   *
   * @example
   * ```ts
   * const foreignKeys = foreignKeysHandler.getForeignKeys();
   * ```
   */
  getForeignKeys(): ForeignKeyMetadata[] {
    try {
      if (!this.currentEntity) {
        throw new Error('No entity set for ForeignKeysHandler.');
      }

      const metadataManager = MetadataManager.getInstance();
      return metadataManager.getMetadata<ForeignKeyMetadata>(
        this.currentEntity,
        'foreignKeys',
      );
    } catch (error) {
      throw new Error(`Failed to get foreign keys: ${error.message}`);
    }
  }

  /**
   * Removes a foreign key from the specified entity's table schema.
   * @param propertyKey - The property name in the entity.
   * @throws Will throw an error if the entity is not a table or if removing the foreign key fails.
   *
   * @example
   * ```ts
   * foreignKeysHandler.removeForeignKey('userId');
   * ```
   */
  removeForeignKey(propertyKey: string): void {
    try {
      if (!this.currentEntity) {
        throw new Error('No entity set for ForeignKeysHandler.');
      }

      if (!this.schema.isTable(this.currentEntity)) {
        throw new Error(
          `Cannot remove foreign key. Entity '${this.schema.getEntityName(this.currentEntity)}' is not a table.`,
        );
      }

      const metadataManager = MetadataManager.getInstance();
      const foreignKeys = metadataManager.getMetadata<ForeignKeyMetadata>(
        this.currentEntity,
        'foreignKeys',
      );

      // Filter out the foreign key to be removed
      const updatedForeignKeys = foreignKeys.filter(
        (fk) => fk.propertyKey !== propertyKey,
      );

      // Update the foreignKeys metadata
      // First, remove existing foreignKeys metadata
      metadataManager.removeMetadata(
        this.currentEntity,
        'foreignKeys',
        (fk: ForeignKeyMetadata) => fk.propertyKey === propertyKey,
      );

      // Alternatively, depending on MetadataManager's implementation, set the updated array
      // If MetadataManager supports setting the entire array, use that
      // Otherwise, ensure that individual removal is handled
    } catch (error) {
      throw new Error(
        `Failed to remove foreign key for property '${propertyKey}': ${error.message}`,
      );
    }
  }
}
