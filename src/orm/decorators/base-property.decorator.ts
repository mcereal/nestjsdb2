// src/decorators/base-property.decorator.ts

import { MetadataManager, MetadataType } from '../metadata/metadata-manager';
import { ClassConstructor } from '../types';

/**
 * Abstract base class for property-level decorators.
 */
export abstract class BasePropertyDecorator<T> {
  protected metadataManager: MetadataManager;

  constructor(
    protected metadataType: MetadataType,
    protected optionsValidator: (options: T) => void,
    protected metadataCreator: (
      propertyKey: string | symbol,
      options: T,
    ) => any,
    protected uniqueCheckFn?: (existing: any, newEntry: any) => boolean,
  ) {
    this.metadataManager = new MetadataManager(); // Instantiate MetadataManager
  }

  /**
   * Returns a PropertyDecorator function.
   * @param options - Configuration options for the decorator.
   */
  decorate(options: T): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol) => {
      // Validate options
      this.optionsValidator(options);

      // Create metadata entry
      const metadataEntry = this.metadataCreator(propertyKey, options);

      // Add metadata to the storage using MetadataManager
      this.metadataManager.addMetadata(
        target.constructor as ClassConstructor,
        this.metadataType,
        metadataEntry,
        this.uniqueCheckFn,
      );
    };
  }
}
