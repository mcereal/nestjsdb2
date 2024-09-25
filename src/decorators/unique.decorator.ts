// src/decorators/unique.decorator.ts

import { createPropertyDecorator } from './base.decorator';
import {
  UniqueColumnMetadata,
  UniqueColumnMetadataOptions,
} from '../interfaces';
import { getMetadata } from './utils';

/**
 * Creates unique column metadata from the provided options.
 * @param propertyKey - The property key of the unique column.
 * @param options - The unique column configuration options.
 * @returns The unique column metadata.
 */
const createUniqueColumnMetadata = (
  propertyKey: string | symbol,
  options: UniqueColumnMetadataOptions,
): UniqueColumnMetadata => ({
  propertyKey,
  options,
});

/**
 * Ensures that the property key is unique within unique columns.
 * @param existing - An existing metadata entry.
 * @param newEntry - A new metadata entry.
 * @returns Boolean indicating if the entry already exists.
 */
const uniqueCheckUniqueColumn = (
  existing: UniqueColumnMetadata,
  newEntry: UniqueColumnMetadata,
) => existing.propertyKey === newEntry.propertyKey;

/**
 * @Unique decorator to mark a property as unique in the database.
 * @param options - Configuration options for the unique column.
 * @returns PropertyDecorator
 */
export const Unique = createPropertyDecorator<UniqueColumnMetadataOptions>(
  'uniqueColumns',
  () => {}, // No additional validation needed
  createUniqueColumnMetadata,
  uniqueCheckUniqueColumn,
);

/**
 * Retrieves unique column metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns UniqueColumnMetadata[]
 */
export const getUniqueColumnMetadata = (
  target: any,
): UniqueColumnMetadata[] => {
  return getMetadata<UniqueColumnMetadata>(target, 'uniqueColumns');
};
