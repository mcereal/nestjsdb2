// src/decorators/column.decorator.ts

import "reflect-metadata";
import { ColumnMetadata, ColumnOptions } from "../metadata";
import { COLUMNS_METADATA_KEY } from "../types";

/**
 * @Column decorator to define a database column.
 * @param options - Configuration options for the column.
 * @returns PropertyDecorator
 */
export function Column(options: ColumnOptions): PropertyDecorator {
  if (!options.type || typeof options.type !== "string") {
    throw new Error("Column type must be a non-empty string.");
  }

  return (target: Object, propertyKey: string | symbol) => {
    const constructor = target.constructor;

    // Retrieve existing columns metadata or initialize if none exists
    const existingColumns: ColumnMetadata[] =
      Reflect.getMetadata(COLUMNS_METADATA_KEY, constructor) || [];

    // Add new column metadata
    existingColumns.push({
      propertyKey,
      type: options.type,
      length: options.length,
      nullable: options.nullable,
      default: options.default,
    });

    // Define or update metadata with new columns array
    Reflect.defineMetadata(COLUMNS_METADATA_KEY, existingColumns, constructor);
  };
}
