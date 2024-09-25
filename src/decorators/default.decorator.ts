// src/decorators/default.decorator.ts

import { createPropertyDecorator } from './base.decorator';
import { DefaultMetadata } from '../interfaces';
import { getMetadata } from './utils';

/**
 * Creates default value metadata from the provided value.
 * @param propertyKey - The property key of the column.
 * @param value - The default value.
 * @returns The default value metadata.
 */
const createDefaultMetadata = (
  propertyKey: string | symbol,
  value: any,
): DefaultMetadata => ({
  propertyKey,
  value,
});

/**
 * Ensures that the property key is unique within default values.
 * @param existing - An existing metadata entry.
 * @param newEntry - A new metadata entry.
 * @returns Boolean indicating if the entry already exists.
 */
const uniqueCheckDefault = (
  existing: DefaultMetadata,
  newEntry: DefaultMetadata,
) => existing.propertyKey === newEntry.propertyKey;

/**
 * @Default decorator to define a default value for a database column.
 * @param value - The default value to set.
 * @returns PropertyDecorator
 */
export const Default = createPropertyDecorator<any>(
  'defaultValues',
  () => {}, // No validation needed
  createDefaultMetadata,
  uniqueCheckDefault,
);

/**
 * Retrieves default values metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns DefaultMetadata[]
 */
export const getDefaultValuesMetadata = (target: any): DefaultMetadata[] => {
  return getMetadata<DefaultMetadata>(target, 'defaultValues');
};
