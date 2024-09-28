// src/decorators/constraints.decorator.ts
import { BaseDecorator } from './base.decorator';
import { ConstraintMetadata } from '../interfaces';
import { getMetadata } from './utils';

/**
 * ConstraintDecorator class that extends BaseDecorator to handle check constraint metadata.
 */
class ConstraintDecorator extends BaseDecorator<string> {
  constructor() {
    super(
      'constraints',
      // Validation function for the constraint
      (constraint: string) => {
        if (typeof constraint !== 'string' || constraint.trim().length === 0) {
          throw new Error('Check constraint must be a non-empty string.');
        }
      },
      // Metadata creation function for the constraint
      (propertyKey, constraint) => {
        return {
          propertyKey,
          constraint,
        } as ConstraintMetadata;
      },
    );
  }

  // No need to implement createClassMetadata for constraints as it's a property decorator
  protected createClassMetadata(target: Function, constraint: string): void {
    target;
    constraint;
    return;
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
  return constraintDecoratorInstance.decorate(constraint) as PropertyDecorator;
};

/**
 * Retrieves check constraint metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns ConstraintMetadata[]
 */
export const Constraint = (target: any): ConstraintMetadata[] => {
  return getMetadata<ConstraintMetadata>(target, 'constraints');
};
