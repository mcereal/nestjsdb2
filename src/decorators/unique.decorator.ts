// decorators/unique.decorator.ts

import "reflect-metadata";
import { UniqueColumnMetadata } from "../metadata";
import {
  UniqueColumnMetadataOptions,
  UNIQUE_COLUMNS_METADATA_KEY,
} from "../types";

export function Unique(
  options: UniqueColumnMetadataOptions
): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    const constructor = target.constructor;

    // Retrieve existing unique columns metadata or initialize if none exists
    const uniqueColumns: UniqueColumnMetadata[] =
      Reflect.getMetadata(UNIQUE_COLUMNS_METADATA_KEY, constructor) || [];

    // Check if the property key is already marked as unique
    const existingColumn = uniqueColumns.find(
      (column) => column.propertyKey === propertyKey
    );

    if (!existingColumn) {
      // Add new unique column metadata
      uniqueColumns.push({
        propertyKey,
        uniqueKeyOptions: {
          name: options.name || "",
          columns: options.columns || [],
        },
      });

      // Define or update metadata with the new unique columns
      Reflect.defineMetadata("uniqueColumns", uniqueColumns, constructor);
    }
  };
}
