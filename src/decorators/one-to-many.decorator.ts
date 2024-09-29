// src/decorators/oneToMany.decorator.ts

import { BasePropertyDecorator } from './base-property.decorator';
import { OneToManyMetadata } from '../interfaces';
import { getPropertyMetadata } from './utils';

/**
 * OneToManyDecorator class that extends BasePropertyDecorator to handle one-to-many relationship metadata.
 */
class OneToManyDecorator extends BasePropertyDecorator<
  Partial<OneToManyMetadata>
> {
  constructor() {
    super(
      'oneToManyRelations', // MetadataType
      // Validation function for the OneToMany options
      (options: Partial<OneToManyMetadata>) => {
        if (typeof options.target !== 'function') {
          throw new Error(
            "OneToMany decorator requires a 'target' option that is a function (constructor of the target entity).",
          );
        }
        // Additional validations can be added here if needed
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
      (existing: OneToManyMetadata, newEntry: OneToManyMetadata) =>
        existing.propertyKey === newEntry.propertyKey,
    );
  }

  // No need to implement createClassMetadata as it's a property decorator
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
  return (target: Object, propertyKey: string | symbol) => {
    oneToManyDecoratorInstance.decorate(options)(target, propertyKey);
  };
};

/**
 * Retrieves one-to-many relations metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns OneToManyMetadata[]
 */
export const getOneToManyMetadata = (target: any): OneToManyMetadata[] => {
  return getPropertyMetadata(
    target,
    'oneToManyRelations',
  ) as OneToManyMetadata[];
};
