// src/decorators/oneToOne.decorator.ts

import { BasePropertyDecorator } from './base-property.decorator';
import { OneToOneMetadata } from '../interfaces';
import { getPropertyMetadata } from './utils';

/**
 * OneToOneDecorator class that extends BasePropertyDecorator to handle one-to-one relationship metadata.
 */
class OneToOneDecorator extends BasePropertyDecorator<
  Partial<OneToOneMetadata>
> {
  constructor() {
    super(
      'oneToOneRelations', // MetadataType
      // Validation function for the one-to-one options
      (options: Partial<OneToOneMetadata>) => {
        if (typeof options.target !== 'function') {
          throw new Error(
            "OneToOne decorator requires a 'target' option that is a function (constructor of the target entity).",
          );
        }
      },
      // Metadata Creator
      (propertyKey, options) => ({
        propertyKey,
        target: options.target,
        cascade: options.cascade,
        sourceJoinColumn: options.sourceJoinColumn,
        sourceInverseJoinColumn: options.sourceInverseJoinColumn,
        targetJoinColumn: options.targetJoinColumn,
        targetInverseJoinColumn: options.targetInverseJoinColumn,
        joinTable: options.joinTable,
      }),
      // Unique Check Function (optional)
      (existing: OneToOneMetadata, newEntry: OneToOneMetadata) =>
        existing.propertyKey === newEntry.propertyKey,
    );
  }

  // No need to implement createClassMetadata as it's a property decorator
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
  return (target: Object, propertyKey: string | symbol) => {
    oneToOneDecoratorInstance.decorate(options)(target, propertyKey);
  };
};

/**
 * Retrieves one-to-one relations metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns OneToOneMetadata[]
 */
export const getOneToOneMetadata = (target: any): OneToOneMetadata[] => {
  return getPropertyMetadata(target, 'oneToOneRelations') as OneToOneMetadata[];
};
