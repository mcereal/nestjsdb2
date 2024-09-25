// src/decorators/check.decorator.ts

import { createPropertyDecorator } from './base.decorator';
import { CheckConstraintMetadata } from '../interfaces';
import { getMetadata } from './utils';

/**
 * Validates the check constraint provided to the @Check decorator.
 * @param constraint - The SQL check constraint as a string.
 */
const validateCheckConstraint = (constraint: string) => {
  if (typeof constraint !== 'string' || constraint.trim().length === 0) {
    throw new Error('Check constraint must be a non-empty string.');
  }
};

/**
 * Creates check constraint metadata from the provided constraint.
 * @param propertyKey - The property key for which the constraint is applied.
 * @param constraint - The SQL check constraint.
 * @returns The check constraint metadata.
 */
const createCheckConstraintMetadata = (
  propertyKey: string | symbol,
  constraint: string,
): CheckConstraintMetadata => ({
  propertyKey,
  constraint,
});

/**
 * @Check decorator to define a check constraint for a database column.
 * @param constraint - The SQL check constraint as a string.
 * @returns PropertyDecorator
 */
export const Check = createPropertyDecorator<string>(
  'checkConstraints',
  validateCheckConstraint,
  createCheckConstraintMetadata,
);

/**
 * Retrieves check constraint metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns CheckConstraintMetadata[]
 */
export const getCheckConstraints = (target: any): CheckConstraintMetadata[] => {
  return getMetadata<CheckConstraintMetadata>(target, 'checkConstraints');
};
