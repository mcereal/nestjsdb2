// src/decorators/manyToOne.decorator.ts

import { BasePropertyDecorator } from './base-property.decorator';
import { ManyToOneMetadata } from '../interfaces';
import { getPropertyMetadata } from './utils';

/**
 * ManyToOneDecorator class that extends BasePropertyDecorator to handle many-to-one relationship metadata.
 */
class ManyToOneDecorator extends BasePropertyDecorator<
  Partial<ManyToOneMetadata>
> {
  constructor() {
    super(
      'manyToOneRelations', // MetadataType
      // Validation function for the ManyToOne options
      (options: Partial<ManyToOneMetadata>) => {
        if (typeof options.target !== 'function') {
          throw new Error(
            "ManyToOne decorator requires a 'target' option that is a function (constructor of the target entity).",
          );
        }
        // Additional validations can be added here if necessary
      },
      // Metadata Creator
      (propertyKey, options) => ({
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
      }),
      // Unique Check Function (optional)
      (existing: ManyToOneMetadata, newEntry: ManyToOneMetadata) =>
        existing.propertyKey === newEntry.propertyKey,
    );
  }

  // No need to implement createClassMetadata as it's a property decorator
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
  return (target: Object, propertyKey: string | symbol) => {
    manyToOneDecoratorInstance.decorate(options)(target, propertyKey);
  };
};

/**
 * Retrieves many-to-one relations metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns ManyToOneMetadata[]
 */
export const getManyToOneMetadata = (target: any): ManyToOneMetadata[] => {
  return getPropertyMetadata(
    target,
    'manyToOneRelations',
  ) as ManyToOneMetadata[];
};
