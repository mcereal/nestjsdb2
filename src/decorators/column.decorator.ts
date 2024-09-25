// src/decorators/column.decorator.ts

import { createPropertyDecorator } from './base.decorator';
import { ColumnOptions, ColumnMetadata } from '../interfaces';
import { getMetadata } from './utils';

/**
 * Validates the options provided to the @Column decorator.
 * @param options - The column options.
 */
const validateColumnOptions = (options: ColumnOptions) => {
  if (!options.type || typeof options.type !== 'string') {
    throw new Error('Column type must be a non-empty string.');
  }
};

/**
 * Creates column metadata from the provided options.
 * @param propertyKey - The property key of the column.
 * @param options - The column options.
 * @returns The column metadata.
 */
const createColumnMetadata = (
  propertyKey: string | symbol,
  options: ColumnOptions,
): ColumnMetadata => ({
  propertyKey,
  options: {
    type: options.type,
    length: options.length,
    nullable: options.nullable,
    default: options.default,
  },
});

/**
 * @Column decorator to define a database column.
 * @param options - Configuration options for the column.
 * @returns PropertyDecorator
 */
export const Column = createPropertyDecorator<ColumnOptions>(
  'columns',
  validateColumnOptions,
  createColumnMetadata,
);

/**
 * Retrieves column metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns ColumnMetadata[]
 */
export const getColumnMetadata = (target: any): ColumnMetadata[] => {
  return getMetadata<ColumnMetadata>(target, 'columns');
};
