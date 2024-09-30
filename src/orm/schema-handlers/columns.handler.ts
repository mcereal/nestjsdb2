import { Schema } from '../schema';
import { ColumnMetadata } from '../interfaces/column.interfaces';
import { ClassConstructor } from '../types';

/**
 * Handles column-related operations for a schema.
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
 * const columnsHandler = new ColumnsHandler(schema);
 * ```
 */
export class ColumnsHandler {
  private currentEntity!: ClassConstructor<any>;

  constructor(private schema: Schema<any>) {}

  /**
   * Sets the entity on which the handler will operate.
   * @param entity - The entity class constructor.
   * @throws Will throw an error if setting the entity fails.
   *
   * @example
   * ```ts
   * columnsHandler.setEntity(User);
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
   * Adds a new column to the specified entity's table schema.
   * @param propertyKey - The property name in the entity.
   * @param options - Column configuration options.
   * @throws Will throw an error if the entity is not a table or if adding the column fails.
   *
   * @example
   * ```ts
   * columnsHandler.addColumn('email', { type: 'string', unique: true });
   * ```
   */
  addColumn(propertyKey: string, options: ColumnMetadata): void {
    try {
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
        });
      }

      // Handle default values
      if (options.default !== undefined) {
        metadata.tableMetadata!.defaultValues.push({
          propertyKey,
          value: options.default,
        });
      }
    } catch (error) {
      throw new Error(
        `Failed to add column '${propertyKey}': ${error.message}`,
      );
    }
  }

  /**
   * Removes a column from the specified entity's table schema.
   * @param propertyKey - The property name in the entity.
   * @throws Will throw an error if the entity is not a table or if removing the column fails.
   *
   * @example
   * ```ts
   * columnsHandler.removeColumn('email');
   * ```
   */
  removeColumn(propertyKey: string): void {
    try {
      if (!this.currentEntity) {
        throw new Error('No entity set for ColumnsHandler.');
      }

      if (!this.schema.isTable(this.currentEntity)) {
        throw new Error(
          `Cannot remove column. Entity '${this.schema.getEntityName(this.currentEntity)}' is not a table.`,
        );
      }

      const metadata = this.schema.getMetadata(this.currentEntity);
      const columnIdx = metadata.tableMetadata!.columns.findIndex(
        (col) => col.propertyKey === propertyKey,
      );

      if (columnIdx === -1) {
        throw new Error(
          `Cannot remove column. Property '${propertyKey}' does not exist in entity '${this.schema.getEntityName(
            this.currentEntity,
          )}'.`,
        );
      }

      // Remove the column metadata
      metadata.tableMetadata!.columns.splice(columnIdx, 1);

      // Remove primary key metadata
      const pkIdx = metadata.tableMetadata!.primaryKeys.findIndex(
        (pk) => pk.propertyKey === propertyKey,
      );
      if (pkIdx !== -1) {
        metadata.tableMetadata!.primaryKeys.splice(pkIdx, 1);
      }

      // Remove unique index metadata
      const idxIdx = metadata.tableMetadata!.indexedColumns.findIndex(
        (idx) => idx.propertyKey === propertyKey && idx.unique,
      );
      if (idxIdx !== -1) {
        metadata.tableMetadata!.indexedColumns.splice(idxIdx, 1);
      }

      // Remove default value metadata
      const defaultIdx = metadata.tableMetadata!.defaultValues.findIndex(
        (def) => def.propertyKey === propertyKey,
      );
      if (defaultIdx !== -1) {
        metadata.tableMetadata!.defaultValues.splice(defaultIdx, 1);
      }
    } catch (error) {
      throw new Error(
        `Failed to remove column '${propertyKey}': ${error.message}`,
      );
    }
  }

  /**
   * Updates an existing column in the specified entity's table schema.
   * @param propertyKey - The property name in the entity.
   * @param options - Column configuration options.
   * @throws Will throw an error if the entity is not a table or if updating the column fails.
   *
   * @example
   * ```ts
   * columnsHandler.updateColumn('email', { type: 'string', nullable: false });
   * ```
   */
  updateColumn(propertyKey: string, options: Partial<ColumnMetadata>): void {
    try {
      if (!this.currentEntity) {
        throw new Error('No entity set for ColumnsHandler.');
      }

      if (!this.schema.isTable(this.currentEntity)) {
        throw new Error(
          `Cannot update column. Entity '${this.schema.getEntityName(this.currentEntity)}' is not a table.`,
        );
      }

      const metadata = this.schema.getMetadata(this.currentEntity);
      const columnMeta = metadata.tableMetadata!.columns.find(
        (col) => col.propertyKey === propertyKey,
      );

      if (!columnMeta) {
        throw new Error(
          `Cannot update column. Property '${propertyKey}' does not exist in entity '${this.schema.getEntityName(
            this.currentEntity,
          )}'.`,
        );
      }

      // Update the column metadata
      Object.assign(columnMeta, options);

      // Update primary key metadata
      const pkMeta = metadata.tableMetadata!.primaryKeys.find(
        (pk) => pk.propertyKey === propertyKey,
      );
      if (pkMeta) {
        Object.assign(pkMeta, options);
      }

      // Update unique index metadata
      const idxMeta = metadata.tableMetadata!.indexedColumns.find(
        (idx) => idx.propertyKey === propertyKey && idx.unique,
      );
      if (idxMeta) {
        Object.assign(idxMeta, options);
      }

      // Update default value metadata
      const defaultMeta = metadata.tableMetadata!.defaultValues.find(
        (def) => def.propertyKey === propertyKey,
      );
      if (defaultMeta) {
        Object.assign(defaultMeta, options);
      }
    } catch (error) {
      throw new Error(
        `Failed to update column '${propertyKey}': ${error.message}`,
      );
    }
  }
}
