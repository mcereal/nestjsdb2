// src/decorators/manyToMany.decorator.ts

import { BasePropertyDecorator } from './base-property.decorator';
import { ManyToManyMetadata } from '../interfaces/';
import { getPropertyMetadata, MetadataType } from './utils';

/**
 * ManyToManyDecorator class that extends BasePropertyDecorator to handle many-to-many relationship metadata.
 */
class ManyToManyDecorator extends BasePropertyDecorator<ManyToManyMetadata> {
  constructor() {
    super(
      'manyToManyRelations', // MetadataType
      // Options Validator
      (options: ManyToManyMetadata) => {
        if (typeof options.target !== 'function') {
          throw new Error(
            "ManyToMany decorator requires a 'target' option that is a constructor function of the target entity.",
          );
        }
        if (options.joinTable && typeof options.joinTable !== 'string') {
          throw new Error(
            "ManyToMany decorator 'joinTable' option must be a string if provided.",
          );
        }
        if (options.joinColumn && typeof options.joinColumn !== 'string') {
          throw new Error(
            "ManyToMany decorator 'joinColumn' option must be a string if provided.",
          );
        }
        if (
          options.inverseJoinColumn &&
          typeof options.inverseJoinColumn !== 'string'
        ) {
          throw new Error(
            "ManyToMany decorator 'inverseJoinColumn' option must be a string if provided.",
          );
        }
        // Add more validations as needed
      },
      // Metadata Creator
      (propertyKey, options: ManyToManyMetadata) => ({
        propertyKey,
        target: options.target,
        joinTable: options.joinTable,
        cascade: options.cascade,
        joinColumn: options.joinColumn,
        inverseJoinColumn: options.inverseJoinColumn,
        sourceJoinColumn: options.sourceJoinColumn,
        sourceInverseJoinColumn: options.sourceInverseJoinColumn,
        targetJoinColumn: options.targetJoinColumn,
        targetInverseJoinColumn: options.targetInverseJoinColumn,
      }),
      // Unique Check Function (optional)
      (existing: ManyToManyMetadata, newEntry: ManyToManyMetadata) =>
        existing.propertyKey === newEntry.propertyKey,
    );
  }

  // No need to implement createClassMetadata as it's a property decorator
}

// Instance of ManyToManyDecorator
const manyToManyDecoratorInstance = new ManyToManyDecorator();

/**
 * @ManyToMany decorator to define a many-to-many relationship between entities.
 * @param options - Configuration options for the many-to-many relationship.
 * @returns PropertyDecorator
 */
export const ManyToMany = (
  options: Omit<ManyToManyMetadata, 'propertyKey'>,
): PropertyDecorator => {
  return (target: Object, propertyKey: string | symbol) => {
    manyToManyDecoratorInstance.decorate({
      ...options,
      propertyKey: propertyKey as string,
    })(target, propertyKey);
  };
};

/**
 * Retrieves many-to-many relations metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns ManyToManyMetadata[]
 */
export const getManyToManyMetadata = (target: any): ManyToManyMetadata[] => {
  return getPropertyMetadata(
    target,
    'manyToManyRelations',
  ) as ManyToManyMetadata[];
};
