// src/decorators/manyToOne.decorator.ts

import { createPropertyDecorator } from './base.decorator';
import { ManyToOneMetadata, ManyToOneOptions } from '../interfaces';
import { getMetadata } from './utils';

/**
 * Validates the options provided to the @ManyToOne decorator.
 * @param options - The many-to-one relationship options.
 */
const validateManyToOneOptions = (options: ManyToOneOptions) => {
  if (typeof options.target !== 'function') {
    throw new Error(
      "ManyToOne decorator requires a 'target' option that is a function (constructor of the target entity).",
    );
  }

  // Additional validations can be added here if necessary
};

/**
 * Creates many-to-one metadata from the provided options.
 * @param propertyKey - The property key of the relationship.
 * @param options - The many-to-one relationship options.
 * @returns The many-to-one metadata.
 */
const createManyToOneMetadata = (
  propertyKey: string | symbol,
  options: ManyToOneOptions,
): ManyToOneMetadata => ({
  propertyKey,
  options,
});

/**
 * Ensures that the property key is unique within many-to-one relations.
 * @param existing - An existing metadata entry.
 * @param newEntry - A new metadata entry.
 * @returns Boolean indicating if the entry already exists.
 */
const uniqueCheckManyToOne = (
  existing: ManyToOneMetadata,
  newEntry: ManyToOneMetadata,
) => existing.propertyKey === newEntry.propertyKey;

/**
 * @ManyToOne decorator to define a many-to-one relationship between entities.
 * @param options - Configuration options for the relationship.
 * @returns PropertyDecorator
 */
export const ManyToOne = createPropertyDecorator<ManyToOneOptions>(
  'manyToOneRelations',
  validateManyToOneOptions,
  createManyToOneMetadata,
  uniqueCheckManyToOne,
);

/**
 * Retrieves many-to-one relations metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns ManyToOneMetadata[]
 */
export const getManyToOneMetadata = (target: any): ManyToOneMetadata[] => {
  return getMetadata<ManyToOneMetadata>(target, 'manyToOneRelations');
};
