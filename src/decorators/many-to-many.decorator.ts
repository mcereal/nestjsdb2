// src/decorators/manyToMany.decorator.ts

import { createPropertyDecorator } from './base.decorator';
import { ManyToManyOptions, ManyToManyMetadata } from '../interfaces';
import { getMetadata } from './utils';

/**
 * Validates the options provided to the @ManyToMany decorator.
 * @param options - The many-to-many relationship options.
 */
const validateManyToManyOptions = (options: ManyToManyOptions) => {
  if (typeof options.target !== 'function') {
    throw new Error(
      "ManyToMany decorator requires a 'target' option that is a function (constructor of the target entity).",
    );
  }

  if (options.joinTable && typeof options.joinTable !== 'string') {
    throw new Error(
      "ManyToMany decorator 'joinTable' option must be a string if provided.",
    );
  }
};

/**
 * Creates many-to-many metadata from the provided options.
 * @param propertyKey - The property key of the relationship.
 * @param options - The many-to-many relationship options.
 * @returns The many-to-many metadata.
 */
const createManyToManyMetadata = (
  propertyKey: string | symbol,
  options: ManyToManyOptions,
): ManyToManyMetadata => ({
  propertyKey,
  options,
});

/**
 * Ensures that the property key is unique within many-to-many relations.
 * @param existing - An existing metadata entry.
 * @param newEntry - A new metadata entry.
 * @returns Boolean indicating if the entry already exists.
 */
const uniqueCheckManyToMany = (
  existing: ManyToManyMetadata,
  newEntry: ManyToManyMetadata,
) => existing.propertyKey === newEntry.propertyKey;

/**
 * @ManyToMany decorator to define a many-to-many relationship between entities.
 * @param options - Configuration options for the relationship.
 * @returns PropertyDecorator
 */
export const ManyToMany = createPropertyDecorator<ManyToManyOptions>(
  'manyToManyRelations',
  validateManyToManyOptions,
  createManyToManyMetadata,
  uniqueCheckManyToMany,
);

/**
 * Retrieves many-to-many relations metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns ManyToManyMetadata[]
 */
export const getManyToManyMetadata = (target: any): ManyToManyMetadata[] => {
  return getMetadata<ManyToManyMetadata>(target, 'manyToManyRelations');
};
