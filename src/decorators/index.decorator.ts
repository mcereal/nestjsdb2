// src/decorators/index.decorator.ts

import 'reflect-metadata';
import { IndexMetadata } from '../metadata/entity-metadata.storage';
import { INDEXED_COLUMNS_METADATA_KEY } from '../types';

/**
 * @Index decorator to mark a property as indexed.
 * Can be extended with additional options if needed.
 * @returns PropertyDecorator
 */
export function Index(): PropertyDecorator {
  return (
    target: new (...args: any[]) => any,
    propertyKey: string | symbol,
  ) => {
    const constructor = target.constructor;

    // Retrieve existing index metadata or initialize if none exists
    const indexColumns: IndexMetadata[] =
      Reflect.getMetadata(INDEXED_COLUMNS_METADATA_KEY, constructor) || [];

    // Check if the property is already marked as an index to avoid duplicates
    const isAlreadyIndexed = indexColumns.some(
      (index) => index.propertyKey === propertyKey,
    );

    if (!isAlreadyIndexed) {
      // Add new index metadata
      indexColumns.push({ propertyKey, name: propertyKey.toString() });

      // Define or update metadata with the new index columns
      Reflect.defineMetadata(
        INDEXED_COLUMNS_METADATA_KEY,
        indexColumns,
        constructor,
      );
    }
  };
}
