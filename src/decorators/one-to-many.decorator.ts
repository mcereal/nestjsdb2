// src/decorators/oneToMany.decorator.ts

import { createPropertyDecorator } from './base.decorator';
import { OneToManyOptions, OneToManyMetadata } from '../interfaces';
import { getMetadata } from './utils';

/**
 * Validates the options provided to the @OneToMany decorator.
 * @param options - The one-to-many relationship options.
 */
const validateOneToManyOptions = (options: OneToManyOptions) => {
  if (typeof options.target !== 'function') {
    throw new Error(
      "OneToMany decorator requires a 'target' option that is a function (constructor of the target entity).",
    );
  }

  // You can add more validations here if needed, for example:
  // if (!options.inverseSide || typeof options.inverseSide !== 'string') {
  //   throw new Error("OneToMany decorator requires an 'inverseSide' option that is a string.");
  // }
};

/**
 * Creates one-to-many metadata from the provided options.
 * @param propertyKey - The property key of the relationship.
 * @param options - The one-to-many relationship options.
 * @returns The one-to-many metadata.
 */
const createOneToManyMetadata = (
  propertyKey: string | symbol,
  options: OneToManyOptions,
): OneToManyMetadata => ({
  propertyKey,
  options,
});

/**
 * Ensures that the property key is unique within one-to-many relations.
 * @param existing - An existing metadata entry.
 * @param newEntry - A new metadata entry.
 * @returns Boolean indicating if the entry already exists.
 */
const uniqueCheckOneToMany = (
  existing: OneToManyMetadata,
  newEntry: OneToManyMetadata,
) => existing.propertyKey === newEntry.propertyKey;

/**
 * @OneToMany decorator to define a one-to-many relationship between entities.
 * @param options - Configuration options for the relationship.
 * @returns PropertyDecorator
 */
export const OneToMany = createPropertyDecorator<OneToManyOptions>(
  'oneToManyRelations',
  validateOneToManyOptions,
  createOneToManyMetadata,
  uniqueCheckOneToMany,
);

/**
 * Retrieves one-to-many relations metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns OneToManyMetadata[]
 */
export const getOneToManyMetadata = (target: any): OneToManyMetadata[] => {
  return getMetadata<OneToManyMetadata>(target, 'oneToManyRelations');
};
