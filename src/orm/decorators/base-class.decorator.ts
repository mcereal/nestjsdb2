// src/decorators/base-class.decorator.ts

import { MetadataManager, MetadataType } from '../metadata/metadata-manager';
import { ClassConstructor } from '../types';

/**
 * Abstract base class for class-level decorators.
 */
export abstract class BaseClassDecorator<T> {
  protected metadataManager: MetadataManager;

  constructor(
    protected metadataType: MetadataType,
    protected optionsValidator: (options: T) => void,
    protected metadataCreator: (options: T) => any,
    protected uniqueCheckFn?: (existing: any, newEntry: any) => boolean,
  ) {
    this.metadataManager = new MetadataManager(); // Instantiate MetadataManager
  }

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

      // Add metadata to the storage using MetadataManager
      this.metadataManager.addMetadata(
        target as ClassConstructor<any>,
        this.metadataType,
        metadataEntry,
        this.uniqueCheckFn,
      );
    };
  }
}
