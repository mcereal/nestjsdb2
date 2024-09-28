// src/decorators/oneToMany.decorator.ts
import { BaseDecorator } from './base.decorator';
import { OneToManyMetadata } from '../interfaces';
import { getMetadata } from './utils';

/**
 * OneToManyDecorator class that extends BaseDecorator to handle one-to-many relationship metadata.
 */
class OneToManyDecorator extends BaseDecorator<Partial<OneToManyMetadata>> {
  constructor() {
    super(
      'oneToManyRelations',
      // Validation function for the OneToMany options
      (options: Partial<OneToManyMetadata>) => {
        if (typeof options.target !== 'function') {
          throw new Error(
            "OneToMany decorator requires a 'target' option that is a function (constructor of the target entity).",
          );
        }

        // Additional validations can be added here if needed
      },
      // Metadata creation function for OneToMany
      (propertyKey, options) => {
        return {
          propertyKey,
          target: options.target,
          cascade: options.cascade,
          sourceJoinColumn: options.sourceJoinColumn,
          sourceInverseJoinColumn: options.sourceInverseJoinColumn,
          targetJoinColumn: options.targetJoinColumn,
          targetInverseJoinColumn: options.targetInverseJoinColumn,
          joinTable: options.joinTable,
        } as OneToManyMetadata;
      },
      // Unique check function to ensure the property key is unique within one-to-many relations
      (existing: OneToManyMetadata, newEntry: OneToManyMetadata) =>
        existing.propertyKey === newEntry.propertyKey,
    );
  }

  // No need to implement createClassMetadata for one-to-many as it's a property decorator
  protected createClassMetadata(target: Function): void {
    target;
    return;
  }
}

// Instance of OneToManyDecorator
const oneToManyDecoratorInstance = new OneToManyDecorator();

/**
 * @OneToMany decorator to define a one-to-many relationship between entities.
 * @param options - Configuration options for the relationship.
 * @returns PropertyDecorator
 */
export const OneToMany = (
  options: Partial<OneToManyMetadata>,
): PropertyDecorator => {
  return oneToManyDecoratorInstance.decorate(options) as PropertyDecorator;
};

/**
 * Retrieves one-to-many relations metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns OneToManyMetadata[]
 */
export const getOneToManyMetadata = (target: any): OneToManyMetadata[] => {
  return getMetadata<OneToManyMetadata>(target, 'oneToManyRelations');
};
