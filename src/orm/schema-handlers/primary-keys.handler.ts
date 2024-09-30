import { Schema } from '../schema';
import { PrimaryKeyMetadata } from '../interfaces';
import { ClassConstructor } from '../types';

/**
 * Handles primary key-related operations for a schema.
 * @noInheritDoc
 * @internal
 * @hidden
 * @ignore
 * @since 1.1.9
 * @category SchemaHandlers
 * @template Entity - The entity class type.
 * @template PrimaryKeyType - The primary key type.
 *
 * @example
 * ```ts
 * const primaryKeysHandler = new PrimaryKeysHandler(schema);
 * ```
 */
export class PrimaryKeysHandler {
  private currentEntity!: ClassConstructor<any>;

  constructor(private schema: Schema<any>) {}

  /**
   * Sets the entity on which the handler will operate.
   * @param entity - The entity class constructor.
   * @throws Will throw an error if setting the entity fails.
   *
   * @example
   * ```ts
   * primaryKeysHandler.setEntity(User);
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
   * Defines a primary key on a column for the current entity.
   * @param propertyKey - The property name in the entity.
   * @param options - Optional configurations for the primary key.
   * @throws Will throw an error if the entity is not a table, if the property is not valid, or if setting the primary key fails.
   *
   * @example
   * ```ts
   * primaryKeysHandler.setPrimaryKey('id', { name: 'user_pk', type: 'number' });
   * ```
   */
  setPrimaryKey(
    propertyKey: string,
    options: Partial<PrimaryKeyMetadata> = {},
  ): void {
    try {
      if (!this.currentEntity) {
        throw new Error('No entity set for PrimaryKeysHandler.');
      }

      // Validate that the entity is a table
      if (!this.schema.isTable(this.currentEntity)) {
        throw new Error(
          `Cannot set primary key. Entity '${this.schema.getEntityName(this.currentEntity)}' is not a table.`,
        );
      }

      // Validate that the propertyKey exists as a column in the table metadata
      const existingColumns = this.schema
        .getMetadata(this.currentEntity)
        .tableMetadata!.columns.map((col) => col.propertyKey);
      if (!existingColumns.includes(propertyKey)) {
        throw new Error(
          `Invalid primary key property: ${propertyKey}. Make sure the key is a valid table column in entity '${this.schema.getEntityName(this.currentEntity)}'.`,
        );
      }

      // Construct primary key metadata using spread operator
      const primaryKeyMeta: PrimaryKeyMetadata = {
        propertyKey,
        name: options.name || `${propertyKey}_pk`,
        type: options.type || 'string',
        unique: options.unique ?? true,
        nullable: options.nullable ?? false,
        autoIncrement: options.autoIncrement ?? false,
        ...options,
      };

      // Add the primary key metadata to the table metadata in the schema
      this.schema
        .getMetadata(this.currentEntity)
        .tableMetadata!.primaryKeys.push(primaryKeyMeta);
    } catch (error) {
      throw new Error(
        `Failed to set primary key for property '${propertyKey}': ${error.message}`,
      );
    }
  }

  /**
   * Gets the primary key metadata for the current entity.
   * @returns The primary key metadata object.
   * @throws Will throw an error if the entity is not a table or if retrieving the primary key fails.
   *
   * @example
   * ```ts
   * const primaryKey = primaryKeysHandler.getPrimaryKey();
   * ```
   */
  getPrimaryKey(): PrimaryKeyMetadata | undefined {
    try {
      if (!this.currentEntity) {
        throw new Error('No entity set for PrimaryKeysHandler.');
      }

      return this.schema.getMetadata(this.currentEntity).tableMetadata!
        .primaryKeys[0];
    } catch (error) {
      throw new Error(`Failed to get primary key: ${error.message}`);
    }
  }

  /**
   * Removes the primary key from the current entity's table schema.
   * @throws Will throw an error if the entity is not a table or if removing the primary key fails.
   *
   * @example
   * ```ts
   * primaryKeysHandler.removePrimaryKey();
   * ```
   */
  removePrimaryKey(): void {
    try {
      if (!this.currentEntity) {
        throw new Error('No entity set for PrimaryKeysHandler.');
      }

      if (!this.schema.isTable(this.currentEntity)) {
        throw new Error(
          `Cannot remove primary key. Entity '${this.schema.getEntityName(this.currentEntity)}' is not a table.`,
        );
      }

      const metadata = this.schema.getMetadata(this.currentEntity);
      metadata.tableMetadata!.primaryKeys = [];
    } catch (error) {
      throw new Error(`Failed to remove primary key: ${error.message}`);
    }
  }
}
