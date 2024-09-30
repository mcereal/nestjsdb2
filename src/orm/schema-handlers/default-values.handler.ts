// src/orm/schema-handlers/default-values.handler.ts

import { Schema } from '../schema';
import { DefaultMetadata } from '../interfaces';
import { ClassConstructor } from '../types';

/**
 * Handles default value-related operations for a schema.
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
 * const defaultValuesHandler = new DefaultValuesHandler(schema);
 * ```
 */
export class DefaultValuesHandler {
  private currentEntity!: ClassConstructor<any>;

  constructor(private schema: Schema<any>) {}

  /**
   * Sets the entity on which the handler will operate.
   * @param entity - The entity class constructor.
   * @throws Will throw an error if setting the entity fails.
   *
   * @example
   * ```ts
   * defaultValuesHandler.setEntity(User);
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
   * Defines a default value on a column for the current entity.
   * @param propertyKey - The property name in the entity.
   * @param value - The default value.
   * @throws Will throw an error if the entity is not a table, if the property is not valid, or if setting the default value fails.
   *
   * @example
   * ```ts
   * defaultValuesHandler.setDefaultValue('status', 'active');
   * ```
   */
  setDefaultValue(propertyKey: string, value: any): void {
    try {
      if (!this.currentEntity) {
        throw new Error('No entity set for DefaultValuesHandler.');
      }

      // Validate the entity type
      if (!this.schema.isTable(this.currentEntity)) {
        throw new Error(
          `Cannot set default value. Entity '${this.schema.getEntityName(this.currentEntity)}' is not a table.`,
        );
      }

      // Validate that the propertyKey exists in the table's columns
      const existingColumns = this.schema
        .getMetadata(this.currentEntity)
        .tableMetadata!.columns.map((col) => col.propertyKey);
      if (!existingColumns.includes(propertyKey)) {
        throw new Error(
          `Cannot set default value. Property '${propertyKey}' does not exist in entity '${this.schema.getEntityName(this.currentEntity)}'.`,
        );
      }

      // Prevent duplicate default values on the same property
      const existingDefaults = this.schema.getMetadata(this.currentEntity)
        .tableMetadata!.defaultValues;
      if (
        existingDefaults.some(
          (defaultMeta) => defaultMeta.propertyKey === propertyKey,
        )
      ) {
        throw new Error(
          `Default value already exists for property '${propertyKey}' in entity '${this.schema.getEntityName(this.currentEntity)}'.`,
        );
      }

      // Construct the default metadata
      const defaultMeta: DefaultMetadata = {
        propertyKey,
        value,
      };

      // Push the default metadata to the table metadata of the current entity
      this.schema
        .getMetadata(this.currentEntity)
        .tableMetadata!.defaultValues.push(defaultMeta);
    } catch (error) {
      throw new Error(
        `Failed to set default value for property '${propertyKey}': ${error.message}`,
      );
    }
  }

  /**
   * Removes a default value from the specified entity's table schema.
   * @param propertyKey - The property name in the entity.
   * @throws Will throw an error if the entity is not a table or if removing the default value fails.
   *
   * @example
   * ```ts
   * defaultValuesHandler.removeDefaultValue('status');
   * ```
   */
  removeDefaultValue(propertyKey: string): void {
    try {
      if (!this.currentEntity) {
        throw new Error('No entity set for DefaultValuesHandler.');
      }

      if (!this.schema.isTable(this.currentEntity)) {
        throw new Error(
          `Cannot remove default value. Entity '${this.schema.getEntityName(this.currentEntity)}' is not a table.`,
        );
      }

      const metadata = this.schema.getMetadata(this.currentEntity);
      const defaultIdx = metadata.tableMetadata!.defaultValues.findIndex(
        (defaultMeta) => defaultMeta.propertyKey === propertyKey,
      );

      if (defaultIdx === -1) {
        throw new Error(
          `Cannot remove default value. Property '${propertyKey}' does not have a default value in entity '${this.schema.getEntityName(this.currentEntity)}'.`,
        );
      }

      metadata.tableMetadata!.defaultValues.splice(defaultIdx, 1);
    } catch (error) {
      throw new Error(
        `Failed to remove default value for property '${propertyKey}': ${error.message}`,
      );
    }
  }

  /**
   * Clears all default values from the specified entity's table schema.
   * @throws Will throw an error if the entity is not a table or if clearing the default values fails.
   *
   * @example
   * ```ts
   * defaultValuesHandler.clearDefaultValues();
   * ```
   */
  clearDefaultValues(): void {
    try {
      if (!this.currentEntity) {
        throw new Error('No entity set for DefaultValuesHandler.');
      }

      if (!this.schema.isTable(this.currentEntity)) {
        throw new Error(
          `Cannot clear default values. Entity '${this.schema.getEntityName(this.currentEntity)}' is not a table.`,
        );
      }

      this.schema.getMetadata(this.currentEntity).tableMetadata!.defaultValues =
        [];
    } catch (error) {
      throw new Error(`Failed to clear default values: ${error.message}`);
    }
  }

  /**
   * Gets the default value for the specified property in the current entity.
   * @param propertyKey - The property name in the entity.
   * @returns The default value or undefined if not found.
   * @throws Will throw an error if retrieving the default value fails.
   *
   * @example
   * ```ts
   * const defaultValue = defaultValuesHandler.getDefaultValue('status');
   * ```
   */
  getDefaultValue(propertyKey: string): any | undefined {
    try {
      if (!this.currentEntity) {
        throw new Error('No entity set for DefaultValuesHandler.');
      }

      const defaultMeta = this.schema
        .getMetadata(this.currentEntity)
        .tableMetadata!.defaultValues.find(
          (defaultMeta) => defaultMeta.propertyKey === propertyKey,
        );

      return defaultMeta?.value;
    } catch (error) {
      throw new Error(
        `Failed to get default value for property '${propertyKey}': ${error.message}`,
      );
    }
  }
}
