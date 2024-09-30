// src/orm/schema-handlers/foreign-keys.handler.ts

import { Schema } from '../schema';
import { ForeignKeyMetadata } from '../interfaces';
import { ClassConstructor } from '../types';

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

      // Construct foreign key metadata using the spread operator
      const foreignKeyMeta: ForeignKeyMetadata = {
        propertyKey,
        reference: `${options.referencedTable}(${options.referencedColumnNames.join(', ')})`,
        columnNames: options.columnNames || [propertyKey], // Default to using the property key as the column
        referencedTable: options.referencedTable,
        referencedColumnNames: options.referencedColumnNames || ['id'], // Default to 'id' if not specified
        name: options.name || `${propertyKey}_fk`, // Default name if not specified
        ...options, // Spread the rest of the options
      };

      // Push the foreign key metadata to the table metadata of the current entity
      this.schema
        .getMetadata(this.currentEntity)
        .tableMetadata!.foreignKeys.push(foreignKeyMeta);
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

      return this.schema.getMetadata(this.currentEntity).tableMetadata!
        .foreignKeys;
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

      const metadata = this.schema.getMetadata(this.currentEntity);
      metadata.tableMetadata!.foreignKeys =
        metadata.tableMetadata!.foreignKeys.filter(
          (fk) => fk.propertyKey !== propertyKey,
        );
    } catch (error) {
      throw new Error(
        `Failed to remove foreign key for property '${propertyKey}': ${error.message}`,
      );
    }
  }
}
