// src/decorators/base-class.decorator.ts

import { ClassConstructor } from '../types';
import { addClassMetadata, MetadataType } from './utils';

/**
 * Abstract base class for class-level decorators.
 */
export abstract class BaseClassDecorator<T> {
  constructor(
    protected metadataType: MetadataType,
    protected optionsValidator: (options: T) => void,
    protected metadataCreator: (options: T) => any,
    protected uniqueCheckFn?: (existing: any, newEntry: any) => boolean,
  ) {}

  /**
   * Returns a ClassDecorator function.
   * @param options - Configuration options for the decorator.
   */
  decorate(options: T): ClassDecorator {
    return (target: Function) => {
      // Validate options
      this.optionsValidator(options);

      // Create metadata entry
      const metadataEntry = this.metadataCreator(options);

      // Add metadata to the storage
      addClassMetadata(
        target as ClassConstructor<any>,
        this.metadataType,
        metadataEntry,
        this.uniqueCheckFn,
      );
    };
  }

  // No need to implement property-specific methods
}
