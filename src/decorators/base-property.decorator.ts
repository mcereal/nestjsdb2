// src/decorators/base-property.decorator.ts

import { ClassConstructor } from '../types';
import { addPropertyMetadata, MetadataType } from './utils';

/**
 * Abstract base class for property-level decorators.
 */
export abstract class BasePropertyDecorator<T> {
  constructor(
    protected metadataType: MetadataType,
    protected optionsValidator: (options: T) => void,
    protected metadataCreator: (
      propertyKey: string | symbol,
      options: T,
    ) => any,
    protected uniqueCheckFn?: (existing: any, newEntry: any) => boolean,
  ) {}

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

      // Add metadata to the storage
      addPropertyMetadata(
        target.constructor as ClassConstructor,
        this.metadataType,
        metadataEntry,
        this.uniqueCheckFn,
      );
    };
  }

  // No need to implement class-specific methods
}
