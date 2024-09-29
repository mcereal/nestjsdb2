// src/orm/schema-handlers/default-values.handler.ts

import { Schema } from '../schema';
import { DefaultMetadata } from '../../interfaces';
import { ClassConstructor } from '../../types';

/**
 * Handles default value-related operations for a schema.
 */
export class DefaultValuesHandler {
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
   * Defines a default value on a column for the current entity.
   * @param propertyKey - The property name in the entity.
   * @param value - The default value.
   * @throws Will throw an error if the entity is not a table or if the property is not valid.
   */
  setDefaultValue(propertyKey: string, value: any): void {
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
  }
}
