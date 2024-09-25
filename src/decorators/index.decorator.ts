// src/decorators/index.decorator.ts

import { createPropertyDecorator } from './base.decorator';
import { IndexedColumnMetadata } from '../interfaces';
import { getMetadata } from './utils';

/**
 * Creates index metadata for the property.
 * @param propertyKey - The property key of the indexed column.
 * @returns The index metadata.
 */
const createIndexMetadata = (
  propertyKey: string | symbol,
): IndexedColumnMetadata => ({
  propertyKey,
  options: {
    name: '', // Default to empty string
    unique: false, // Default to non-unique index
  },
});

/**
 * Ensures that the property key is unique within indexed columns.
 * @param existing - An existing metadata entry.
 * @param newEntry - A new metadata entry.
 * @returns Boolean indicating if the entry already exists.
 */
const uniqueCheckIndex = (
  existing: IndexedColumnMetadata,
  newEntry: IndexedColumnMetadata,
) => existing.propertyKey === newEntry.propertyKey;

/**
 * @Index decorator to mark a property as indexed.
 * Can be extended with additional options if needed.
 * @returns PropertyDecorator
 */
export const Index = createPropertyDecorator<void>(
  'indexedColumns',
  () => {}, // No validation required for now
  createIndexMetadata,
  uniqueCheckIndex,
);

/**
 * Retrieves index metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns IndexedColumnMetadata[]
 */
export const getIndexMetadata = (target: any): IndexedColumnMetadata[] => {
  return getMetadata<IndexedColumnMetadata>(target, 'indexedColumns');
};
