// src/orm/schema-handlers/default-values.handler.ts

import { Schema } from '../schema';
import { DefaultMetadata } from '../../interfaces';

/**
 * Handles default value-related operations for a schema.
 */
export class DefaultValuesHandler<T> {
  constructor(private schema: Schema<T>) {}

  /**
   * Defines a default value on a column.
   * @param propertyKey - The property name in the entity.
   * @param value - The default value.
   * @throws Will throw an error if the entity is not a table or if the property is not valid.
   */
  setDefaultValue(propertyKey: string, value: any): void {
    // Validate the entity type
    if (!this.schema.isTable()) {
      throw new Error(
        `Cannot set default value. Entity '${this.schema.getEntityName()}' is not a table.`,
      );
    }

    // Validate that the propertyKey exists in the table's columns
    const existingColumns = this.schema
      .getMetadata()
      .tableMetadata!.columns.map((col) => col.propertyKey);
    if (!existingColumns.includes(propertyKey)) {
      throw new Error(
        `Cannot set default value. Property '${propertyKey}' does not exist in entity '${this.schema.getEntityName()}'.`,
      );
    }

    // Prevent duplicate default values on the same property
    const existingDefaults =
      this.schema.getMetadata().tableMetadata!.defaultValues;
    if (
      existingDefaults.some(
        (defaultMeta) => defaultMeta.propertyKey === propertyKey,
      )
    ) {
      throw new Error(
        `Default value already exists for property '${propertyKey}' in entity '${this.schema.getEntityName()}'.`,
      );
    }

    // Construct the default metadata
    const defaultMeta: DefaultMetadata = {
      propertyKey,
      value,
    };

    // Push the default metadata to the table metadata in the schema
    this.schema.getMetadata().tableMetadata!.defaultValues.push(defaultMeta);
  }
}
