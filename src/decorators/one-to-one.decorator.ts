// src/decorators/oneToOne.decorator.ts

import { createPropertyDecorator } from './base.decorator';
import { OneToOneOptions, OneToOneMetadata } from '../interfaces';
import { getMetadata } from './utils';

/**
 * Validates the options provided to the @OneToOne decorator.
 * @param options - The one-to-one relationship options.
 */
const validateOneToOneOptions = (options: OneToOneOptions) => {
  if (typeof options.target !== 'function') {
    throw new Error(
      "OneToOne decorator requires a 'target' option that is a function (constructor of the target entity).",
    );
  }
};

/**
 * Creates one-to-one metadata from the provided options.
 * @param propertyKey - The property key of the relationship.
 * @param options - The one-to-one relationship options.
 * @returns The one-to-one metadata.
 */
const createOneToOneMetadata = (
  propertyKey: string | symbol,
  options: OneToOneOptions,
): OneToOneMetadata => ({
  propertyKey,
  options,
});

/**
 * Ensures that the property key is unique within one-to-one relations.
 * @param existing - An existing metadata entry.
 * @param newEntry - A new metadata entry.
 * @returns Boolean indicating if the entry already exists.
 */
const uniqueCheckOneToOne = (
  existing: OneToOneMetadata,
  newEntry: OneToOneMetadata,
) => existing.propertyKey === newEntry.propertyKey;

/**
 * @OneToOne decorator to define a one-to-one relationship between entities.
 * @param options - Configuration options for the relationship.
 * @returns PropertyDecorator
 */
export const OneToOne = createPropertyDecorator<OneToOneOptions>(
  'oneToOneRelations',
  validateOneToOneOptions,
  createOneToOneMetadata,
  uniqueCheckOneToOne,
);

/**
 * Retrieves one-to-one relations metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns OneToOneMetadata[]
 */
export const getOneToOneMetadata = (target: any): OneToOneMetadata[] => {
  return getMetadata<OneToOneMetadata>(target, 'oneToOneRelations');
};
