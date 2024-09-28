// src/decorators/oneToOne.decorator.ts
import { BaseDecorator } from './base.decorator';
import { OneToOneMetadata } from '../interfaces';
import { getMetadata } from './utils';

/**
 * OneToOneDecorator class that extends BaseDecorator to handle one-to-one relationship metadata.
 */
class OneToOneDecorator extends BaseDecorator<Partial<OneToOneMetadata>> {
  constructor() {
    super(
      'oneToOneRelations',
      // Validation function for the one-to-one options
      (options: Partial<OneToOneMetadata>) => {
        if (typeof options.target !== 'function') {
          throw new Error(
            "OneToOne decorator requires a 'target' option that is a function (constructor of the target entity).",
          );
        }
      },
      // Metadata creation function for the one-to-one relationship
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
        } as OneToOneMetadata;
      },
      // Unique check function to ensure the property key is unique within one-to-one relations
      (existing: OneToOneMetadata, newEntry: OneToOneMetadata) =>
        existing.propertyKey === newEntry.propertyKey,
    );
  }

  // No need to implement createClassMetadata for one-to-one as it's a property decorator
  protected createClassMetadata(target: Function): void {
    target;
    return;
  }
}

// Instance of OneToOneDecorator
const oneToOneDecoratorInstance = new OneToOneDecorator();

/**
 * @OneToOne decorator to define a one-to-one relationship between entities.
 * @param options - Configuration options for the relationship.
 * @returns PropertyDecorator
 */
export const OneToOne = (
  options: Partial<OneToOneMetadata>,
): PropertyDecorator => {
  return oneToOneDecoratorInstance.decorate(options) as PropertyDecorator;
};

/**
 * Retrieves one-to-one relations metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns OneToOneMetadata[]
 */
export const getOneToOneMetadata = (target: any): OneToOneMetadata[] => {
  return getMetadata<OneToOneMetadata>(target, 'oneToOneRelations');
};
