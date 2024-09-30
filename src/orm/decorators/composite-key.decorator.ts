// src/decorators/compositeKey.decorator.ts

import { BaseClassDecorator } from './base-class.decorator';
import { CompositeKeyMetadata } from '../interfaces';
import { EntityMetadataStorage } from '../metadata';

/**
 * CompositeKeyDecorator class that extends BaseClassDecorator to handle composite key metadata.
 */
class CompositeKeyDecorator extends BaseClassDecorator<string[]> {
  constructor() {
    super(
      'compositeKeys', // MetadataType
      // Validation function for composite keys
      (keys: string[]) => {
        if (!Array.isArray(keys) || keys.length === 0) {
          throw new Error(
            'CompositeKey must be initialized with a non-empty array of strings.',
          );
        }
      },
      // Metadata Creator
      (keys: string[]) => ({ keys }),
      // Unique Check Function (optional)
      (existing: CompositeKeyMetadata, newEntry: CompositeKeyMetadata) =>
        JSON.stringify(existing.keys) === JSON.stringify(newEntry.keys),
    );
  }

  /**
   * Override createClassMetadata to validate keys against the target's properties.
   * @param target - The class to which the decorator is applied.
   * @param keys - The keys forming the composite key.
   */
  protected createClassMetadata(target: Function, keys: string[]): void {
    // Get the prototype of the target to access defined properties
    const prototype = target.prototype;

    // Get existing properties defined in the class prototype
    const existingProperties = Object.getOwnPropertyNames(prototype);

    // Check if all provided keys are valid properties of the class
    const invalidKeys = keys.filter((key) => !existingProperties.includes(key));
    if (invalidKeys.length > 0) {
      throw new Error(
        `Invalid composite key properties: ${invalidKeys.join(
          ', ',
        )}. Make sure all keys are valid class properties.`,
      );
    }

    // Call the base method to add the metadata
    super.decorate(keys)(target);
  }
}

// Instance of CompositeKeyDecorator
const compositeKeyDecoratorInstance = new CompositeKeyDecorator();

/**
 * @CompositeKey decorator to define a composite key in an entity.
 * @param keys - An array of strings representing the properties that form the composite key.
 * @returns ClassDecorator
 */
export const CompositeKey = (keys: string[]): ClassDecorator => {
  return compositeKeyDecoratorInstance.decorate(keys);
};

/**
 * Function to retrieve composite key metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns CompositeKeyMetadata[]
 */
export const getCompositeKeyMetadata = (
  target: Function,
): CompositeKeyMetadata[] => {
  const constructor = target as new (...args: any[]) => any;
  const entityMetadata = EntityMetadataStorage.getEntityMetadata(constructor);
  return entityMetadata?.tableMetadata?.compositeKeys || [];
};
