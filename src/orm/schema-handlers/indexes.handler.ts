import { Schema } from '../schema';
import { IndexedColumnMetadata } from '../interfaces';
import { ClassConstructor } from '../types';

/**
 * Handles index-related operations for a schema.
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
 * const indexesHandler = new IndexesHandler(schema);
 * ```
 */
export class IndexesHandler {
  private currentEntity!: ClassConstructor<any>;

  constructor(private schema: Schema<any>) {}

  /**
   * Sets the entity on which the handler will operate.
   * @param entity - The entity class constructor.
   * @throws Will throw an error if setting the entity fails.
   *
   * @example
   * ```ts
   * indexesHandler.setEntity(User);
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
   * Defines an index on a column for the current entity.
   * @param propertyKey - The property name in the entity.
   * @param options - Index configuration options.
   * @throws Will throw an error if the entity is not a table, if the property is not valid, or if setting the index fails.
   *
   * @example
   * ```ts
   * indexesHandler.setIndex('email', { unique: true });
   * ```
   */
  setIndex(
    propertyKey: string,
    options: Partial<IndexedColumnMetadata> = {},
  ): void {
    try {
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

      // Construct the index metadata using the spread operator
      const indexMeta: IndexedColumnMetadata = {
        propertyKey,
        name: options.name || `${propertyKey}_idx`, // Default name if not specified
        unique: options.unique ?? false,
        type: options.type || 'BTREE', // Default to 'BTREE' if not specified
        ...options,
      };

      // Push the index metadata to the table metadata of the current entity
      this.schema
        .getMetadata(this.currentEntity)
        .tableMetadata!.indexedColumns.push(indexMeta);
    } catch (error) {
      throw new Error(
        `Failed to set index for property '${propertyKey}': ${error.message}`,
      );
    }
  }

  /**
   * Removes an index from the specified entity's table schema.
   * @param propertyKey - The property name in the entity.
   * @throws Will throw an error if the entity is not a table or if removing the index fails.
   *
   * @example
   * ```ts
   * indexesHandler.removeIndex('email');
   * ```
   */
  removeIndex(propertyKey: string): void {
    try {
      if (!this.currentEntity) {
        throw new Error('No entity set for IndexesHandler.');
      }

      if (!this.schema.isTable(this.currentEntity)) {
        throw new Error(
          `Cannot remove index. Entity '${this.schema.getEntityName(this.currentEntity)}' is not a table.`,
        );
      }

      const metadata = this.schema.getMetadata(this.currentEntity);
      const indexIdx = metadata.tableMetadata!.indexedColumns.findIndex(
        (index) => index.propertyKey === propertyKey,
      );

      if (indexIdx === -1) {
        throw new Error(
          `Cannot remove index. Property '${propertyKey}' does not have an index in entity '${this.schema.getEntityName(this.currentEntity)}'.`,
        );
      }

      metadata.tableMetadata!.indexedColumns.splice(indexIdx, 1);
    } catch (error) {
      throw new Error(
        `Failed to remove index for property '${propertyKey}': ${error.message}`,
      );
    }
  }

  /**
   * Gets the index metadata for the current entity.
   * @returns The array of index metadata objects.
   * @throws Will throw an error if the entity is not a table or if retrieving the indexes fails.
   *
   * @example
   * ```ts
   * const indexes = indexesHandler.getIndexes();
   * ```
   */
  getIndexes(): IndexedColumnMetadata[] {
    try {
      if (!this.currentEntity) {
        throw new Error('No entity set for IndexesHandler.');
      }

      return this.schema.getMetadata(this.currentEntity).tableMetadata!
        .indexedColumns;
    } catch (error) {
      throw new Error(`Failed to get indexes: ${error.message}`);
    }
  }

  /**
   * Clears all indexes from the specified entity's table schema.
   * @throws Will throw an error if the entity is not a table or if clearing the indexes fails.
   *
   * @example
   * ```ts
   * indexesHandler.clearIndexes();
   * ```
   */
  clearIndexes(): void {
    try {
      if (!this.currentEntity) {
        throw new Error('No entity set for IndexesHandler.');
      }

      if (!this.schema.isTable(this.currentEntity)) {
        throw new Error(
          `Cannot clear indexes. Entity '${this.schema.getEntityName(this.currentEntity)}' is not a table.`,
        );
      }

      this.schema.getMetadata(
        this.currentEntity,
      ).tableMetadata!.indexedColumns = [];
    } catch (error) {
      throw new Error(`Failed to clear indexes: ${error.message}`);
    }
  }
}
