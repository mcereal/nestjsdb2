// src/decorators/default.decorator.ts

import { BasePropertyDecorator } from './base-property.decorator';
import { DefaultMetadata } from '../interfaces';
import { getPropertyMetadata } from './utils';

/**
 * DefaultDecorator class that extends BasePropertyDecorator to handle default value metadata.
 */
class DefaultDecorator extends BasePropertyDecorator<any> {
  constructor() {
    super(
      'defaultValues', // MetadataType
      // No validation function needed for the default decorator
      () => {},
      // Metadata Creator
      (propertyKey, value) => ({
        propertyKey,
        value,
      }),
      // Unique Check Function (optional)
      (existing: DefaultMetadata, newEntry: DefaultMetadata) =>
        existing.propertyKey === newEntry.propertyKey,
    );
  }

  // No need to implement createClassMetadata as it's a property decorator
}

// Instance of DefaultDecorator
const defaultDecoratorInstance = new DefaultDecorator();

/**
 * @Default decorator to define a default value for a database column.
 * @param value - The default value to set.
 * @returns PropertyDecorator
 */
export const Default = (value: any): PropertyDecorator => {
  return (target: Object, propertyKey: string | symbol) => {
    defaultDecoratorInstance.decorate(value)(target, propertyKey);
  };
};

/**
 * Retrieves default values metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns DefaultMetadata[]
 */
export const getDefaultValuesMetadata = (target: any): DefaultMetadata[] => {
  return getPropertyMetadata(target, 'defaultValues') as DefaultMetadata[];
};
