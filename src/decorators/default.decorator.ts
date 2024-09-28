// src/decorators/default.decorator.ts
import { BaseDecorator } from './base.decorator';
import { DefaultMetadata } from '../interfaces';
import { getMetadata } from './utils';

/**
 * DefaultDecorator class that extends BaseDecorator to handle default value metadata.
 */
class DefaultDecorator extends BaseDecorator<any> {
  constructor() {
    super(
      'defaultValues',
      // No validation function needed for the default decorator
      () => {},
      // Metadata creation function for the default value
      (propertyKey, value) => {
        return {
          propertyKey,
          value,
        } as DefaultMetadata;
      },
      // Unique check function to ensure the property key is unique within default values
      (existing: DefaultMetadata, newEntry: DefaultMetadata) =>
        existing.propertyKey === newEntry.propertyKey,
    );
  }

  // No need to implement createClassMetadata for defaults as it's a property decorator
  protected createClassMetadata(target: Function, value: any): void {
    target;
    value;
    return;
  }
}

// Instance of DefaultDecorator
const defaultDecoratorInstance = new DefaultDecorator();

/**
 * @Default decorator to define a default value for a database column.
 * @param value - The default value to set.
 * @returns PropertyDecorator
 */
export const Default = (value: any): PropertyDecorator => {
  return defaultDecoratorInstance.decorate(value) as PropertyDecorator;
};

/**
 * Retrieves default values metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns DefaultMetadata[]
 */
export const getDefaultValuesMetadata = (target: any): DefaultMetadata[] => {
  return getMetadata<DefaultMetadata>(target, 'defaultValues');
};
