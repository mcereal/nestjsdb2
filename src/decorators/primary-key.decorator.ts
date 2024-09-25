// src/decorators/primaryKey.decorator.ts

import { createPropertyDecorator } from './base.decorator';
import { PrimaryKeyMetadata, primeKeyOptions } from '../interfaces';
import { getMetadata } from './utils';

/**
 * Creates primary key metadata for the property.
 * @param propertyKey - The property key of the primary key.
 * @param options - Optional configuration options for the primary key.
 * @returns The primary key metadata.
 */
const createPrimaryKeyMetadata = (
  propertyKey: string | symbol,
  options?: primeKeyOptions,
): PrimaryKeyMetadata => ({
  propertyKey,
  options: options || {},
});

/**
 * Ensures that the property key is unique within primary keys.
 * @param existing - An existing metadata entry.
 * @param newEntry - A new metadata entry.
 * @returns Boolean indicating if the entry already exists.
 */
const uniqueCheckPrimaryKey = (
  existing: PrimaryKeyMetadata,
  newEntry: PrimaryKeyMetadata,
) => existing.propertyKey === newEntry.propertyKey;

/**
 * @PrimaryKey decorator to mark a property as a primary key.
 * @param options - Optional configuration options for the primary key.
 * @returns PropertyDecorator
 */
export const PrimaryKey = createPropertyDecorator<primeKeyOptions | undefined>(
  'primaryKeys',
  () => {}, // No validation needed for now
  createPrimaryKeyMetadata,
  uniqueCheckPrimaryKey,
);

/**
 * Retrieves primary keys metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns PrimaryKeyMetadata[]
 */
export const getPrimaryKeyMetadata = (target: any): PrimaryKeyMetadata[] => {
  return getMetadata<PrimaryKeyMetadata>(target, 'primaryKeys');
};
