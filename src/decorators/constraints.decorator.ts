// src/decorators/constraints.decorator.ts

import { BasePropertyDecorator } from './base-property.decorator';
import { ConstraintMetadata } from '../interfaces';
import { getPropertyMetadata } from './utils';

/**
 * ConstraintDecorator class that extends BasePropertyDecorator to handle check constraint metadata.
 */
class ConstraintDecorator extends BasePropertyDecorator<string> {
  constructor() {
    super(
      'constraints', // MetadataType
      // Validation function for the constraint
      (constraint: string) => {
        if (typeof constraint !== 'string' || constraint.trim().length === 0) {
          throw new Error('Check constraint must be a non-empty string.');
        }
      },
      // Metadata creation function for the constraint
      (propertyKey, constraint) => ({
        propertyKey,
        constraint,
      }),
      // Unique Check Function (optional)
      (existing: ConstraintMetadata, newEntry: ConstraintMetadata) =>
        existing.propertyKey === newEntry.propertyKey &&
        existing.constraint === newEntry.constraint,
    );
  }
}

// Instance of ConstraintDecorator
const constraintDecoratorInstance = new ConstraintDecorator();

/**
 * @Check decorator to define a check constraint for a database column.
 * @param constraint - The SQL check constraint as a string.
 * @returns PropertyDecorator
 */
export const Check = (constraint: string): PropertyDecorator => {
  return (target: Object, propertyKey: string | symbol) => {
    constraintDecoratorInstance.decorate(constraint)(target, propertyKey);
  };
};

/**
 * Retrieves check constraint metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns ConstraintMetadata[]
 */
export const getConstraintMetadata = (target: any): ConstraintMetadata[] => {
  return getPropertyMetadata(target, 'constraints') as ConstraintMetadata[];
};
