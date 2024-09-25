// src/decorators/foreignKey.decorator.ts

import { createPropertyDecorator } from './base.decorator';
import { ForeignKeyMetadata, ForeignKeyOptions } from '../interfaces';
import { getMetadata } from './utils';

/**
 * Validates the options provided to the @ForeignKey decorator.
 * @param options - The foreign key relationship options.
 */
const validateForeignKeyOptions = (options: ForeignKeyOptions) => {
  // Validate that the reference is a properly formatted string
  if (
    typeof options.reference !== 'string' ||
    !options.reference.includes('(') ||
    !options.reference.includes(')')
  ) {
    throw new Error(
      "ForeignKey decorator requires a 'reference' string in the format 'referenced_table(referenced_column)'.",
    );
  }

  // Validate that the onDelete option, if provided, is one of the allowed values
  if (
    options.onDelete &&
    !['CASCADE', 'SET NULL', 'RESTRICT'].includes(options.onDelete)
  ) {
    throw new Error(
      "ForeignKey decorator 'onDelete' option must be 'CASCADE', 'SET NULL', or 'RESTRICT'.",
    );
  }
};

/**
 * Creates foreign key metadata from the provided options.
 * @param propertyKey - The property key of the foreign key.
 * @param options - The foreign key relationship options.
 * @returns The foreign key metadata.
 */
const createForeignKeyMetadata = (
  propertyKey: string | symbol,
  options: ForeignKeyOptions,
): ForeignKeyMetadata => ({
  propertyKey,
  options,
});

/**
 * @ForeignKey decorator to define a foreign key relationship.
 * @param options - Configuration options for the foreign key.
 * @returns PropertyDecorator
 */
export const ForeignKey = createPropertyDecorator<ForeignKeyOptions>(
  'foreignKeys',
  validateForeignKeyOptions,
  createForeignKeyMetadata,
);

/**
 * Retrieves foreign key metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns ForeignKeyMetadata[]
 */
export const getForeignKeyMetadata = (target: any): ForeignKeyMetadata[] => {
  return getMetadata<ForeignKeyMetadata>(target, 'foreignKeys');
};
