// src/decorators/default.decorator.ts

import { MetadataManager, MetadataType } from '../metadata/metadata-manager';
import { DefaultMetadata } from '../interfaces';
import { ClassConstructor } from '../types';

/**
 * DefaultDecorator class to handle default value metadata using MetadataManager.
 */
class DefaultDecorator {
  private metadataType: MetadataType = 'defaultValues';
  private metadataManager: MetadataManager;

  constructor() {
    this.metadataManager = new MetadataManager(); // Instantiate MetadataManager
  }

  /**
   * Metadata creation function.
   * @param propertyKey - The property key of the metadata.
   * @param value - The default value to set.
   * @returns DefaultMetadata
   */
  private createMetadata(
    propertyKey: string | symbol,
    value: any,
  ): DefaultMetadata {
    return {
      propertyKey,
      value,
    };
  }

  /**
   * Unique check function to avoid duplicate metadata entries.
   * @param existing - The existing metadata.
   * @param newEntry - The new metadata to add.
   * @returns boolean - Whether the metadata is unique.
   */
  private isUnique(
    existing: DefaultMetadata,
    newEntry: DefaultMetadata,
  ): boolean {
    return existing.propertyKey === newEntry.propertyKey;
  }

  /**
   * Decorator method to add default value metadata to the entity.
   * @param value - The default value to set.
   * @returns PropertyDecorator
   */
  public decorate(value: any): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol) => {
      const metadata = this.createMetadata(propertyKey, value);
      this.metadataManager.addMetadata(
        target.constructor as ClassConstructor,
        this.metadataType,
        metadata,
        this.isUnique,
      );
    };
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
  return defaultDecoratorInstance.decorate(value);
};

/**
 * Retrieves default values metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns DefaultMetadata[]
 */
export const getDefaultValuesMetadata = (target: any): DefaultMetadata[] => {
  const metadataManager = new MetadataManager(); // Create an instance of MetadataManager
  return metadataManager.getMetadata(
    target.constructor,
    'defaultValues',
  ) as DefaultMetadata[];
};
