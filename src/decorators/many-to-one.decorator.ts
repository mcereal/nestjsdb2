// src/decorators/manyToOne.decorator.ts
import { BaseDecorator } from './base.decorator';
import { ManyToOneMetadata } from '../interfaces';
import { getMetadata } from './utils';

/**
 * ManyToOneDecorator class that extends BaseDecorator to handle many-to-one relationship metadata.
 */
class ManyToOneDecorator extends BaseDecorator<Partial<ManyToOneMetadata>> {
  constructor() {
    super(
      'manyToOneRelations',
      // Validation function for the ManyToOne options
      (options: Partial<ManyToOneMetadata>) => {
        if (typeof options.target !== 'function') {
          throw new Error(
            "ManyToOne decorator requires a 'target' option that is a function (constructor of the target entity).",
          );
        }

        // Additional validations can be added here if necessary
      },
      // Metadata creation function for ManyToOne
      (propertyKey, options) => {
        return {
          propertyKey,
          target: options.target,
          joinColumn: options.joinColumn,
          inverseJoinColumn: options.inverseJoinColumn,
          cascade: options.cascade,
          sourceJoinColumn: options.sourceJoinColumn,
          sourceInverseJoinColumn: options.sourceInverseJoinColumn,
          targetJoinColumn: options.targetJoinColumn,
          targetInverseJoinColumn: options.targetInverseJoinColumn,
          joinTable: options.joinTable,
          sourceTable: options.sourceTable,
        } as ManyToOneMetadata;
      },
      // Unique check function to ensure property key is unique within many-to-one relations
      (existing: ManyToOneMetadata, newEntry: ManyToOneMetadata) =>
        existing.propertyKey === newEntry.propertyKey,
    );
  }

  // No need to implement createClassMetadata for many-to-one as it's a property decorator
  protected createClassMetadata(target: Function): void {
    target;
    return;
  }
}

// Instance of ManyToOneDecorator
const manyToOneDecoratorInstance = new ManyToOneDecorator();

/**
 * @ManyToOne decorator to define a many-to-one relationship between entities.
 * @param options - Configuration options for the relationship.
 * @returns PropertyDecorator
 */
export const ManyToOne = (
  options: Partial<ManyToOneMetadata>,
): PropertyDecorator => {
  return manyToOneDecoratorInstance.decorate(options) as PropertyDecorator;
};

/**
 * Retrieves many-to-one relations metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns ManyToOneMetadata[]
 */
export const getManyToOneMetadata = (target: any): ManyToOneMetadata[] => {
  return getMetadata<ManyToOneMetadata>(target, 'manyToOneRelations');
};
