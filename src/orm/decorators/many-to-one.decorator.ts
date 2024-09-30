// src/decorators/manyToOne.decorator.ts

import { MetadataManager, MetadataType } from '../metadata/metadata-manager';
import { ManyToOneMetadata } from '../interfaces';
import { ClassConstructor } from '../types';

/**
 * ManyToOneDecorator class to handle many-to-one relationship metadata using MetadataManager.
 */
class ManyToOneDecorator {
  private metadataType: MetadataType = 'manyToOneRelations';
  private metadataManager: MetadataManager;

  constructor() {
    this.metadataManager = new MetadataManager(); // Instantiate MetadataManager
  }

  /**
   * Validation function for the ManyToOne options.
   * @param options - The options to validate.
   */
  private validateOptions(options: Partial<ManyToOneMetadata>): void {
    if (typeof options.target !== 'function') {
      throw new Error(
        "ManyToOne decorator requires a 'target' option that is a function (constructor of the target entity).",
      );
    }
    // Additional validations can be added here if necessary
  }

  /**
   * Metadata creation function.
   * @param propertyKey - The property key of the metadata.
   * @param options - The options for creating the metadata.
   * @returns ManyToOneMetadata
   */
  private createMetadata(
    propertyKey: string | symbol,
    options: Partial<ManyToOneMetadata>,
  ): ManyToOneMetadata {
    return {
      propertyKey,
      target: options.target, // Ensure target is included
      ...options,
    };
  }

  /**
   * Unique check function to avoid duplicate metadata entries.
   * @param existing - The existing metadata.
   * @param newEntry - The new metadata to add.
   * @returns boolean - Whether the metadata is unique.
   */
  private isUnique(
    existing: ManyToOneMetadata,
    newEntry: ManyToOneMetadata,
  ): boolean {
    return existing.propertyKey === newEntry.propertyKey;
  }

  /**
   * Decorator method to add many-to-one relationship metadata to the entity.
   * @param options - Configuration options for the many-to-one relationship.
   * @returns PropertyDecorator
   */
  public decorate(options: Partial<ManyToOneMetadata>): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol) => {
      this.validateOptions(options);
      const metadata = this.createMetadata(propertyKey, options);
      this.metadataManager.addMetadata(
        target.constructor as ClassConstructor,
        this.metadataType,
        metadata,
        this.isUnique,
      );
    };
  }
}

// Instance of ManyToOneDecorator
const manyToOneDecoratorInstance = new ManyToOneDecorator();

/**
 * @ManyToOne decorator to define a many-to-one relationship between entities.
 * @param options - Configuration options for the relationship.
 * @returns PropertyDecorator
 */
export const ManyToOne = (
  options: Partial<ManyToOneMetadata>,
): PropertyDecorator => {
  return manyToOneDecoratorInstance.decorate(options);
};

/**
 * Retrieves many-to-one relations metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns ManyToOneMetadata[]
 */
export const getManyToOneMetadata = (target: any): ManyToOneMetadata[] => {
  const metadataManager = new MetadataManager(); // Create an instance of MetadataManager
  return metadataManager.getMetadata(
    target.constructor,
    'manyToOneRelations',
  ) as ManyToOneMetadata[];
};
