// src/decorators/oneToOne.decorator.ts

import { MetadataManager, MetadataType } from '../metadata/metadata-manager';
import { OneToOneMetadata } from '../interfaces';
import { ClassConstructor } from '../types';

/**
 * OneToOneDecorator class to handle one-to-one relationship metadata using MetadataManager.
 */
class OneToOneDecorator {
  private metadataType: MetadataType = 'oneToOneRelations';
  private metadataManager: MetadataManager;

  constructor() {
    this.metadataManager = new MetadataManager(); // Instantiate MetadataManager
  }

  /**
   * Validation function for the one-to-one options.
   * @param options - The options to validate.
   */
  private validateOptions(options: Partial<OneToOneMetadata>): void {
    if (typeof options.target !== 'function') {
      throw new Error(
        "OneToOne decorator requires a 'target' option that is a function (constructor of the target entity).",
      );
    }
  }

  /**
   * Metadata creation function.
   * @param propertyKey - The property key of the metadata.
   * @param options - The options for creating the metadata.
   * @returns OneToOneMetadata
   */
  private createMetadata(
    propertyKey: string | symbol,
    options: Partial<OneToOneMetadata>,
  ): OneToOneMetadata {
    return {
      propertyKey,
      target: options.target,
      cascade: options.cascade,
      sourceJoinColumn: options.sourceJoinColumn,
      sourceInverseJoinColumn: options.sourceInverseJoinColumn,
      targetJoinColumn: options.targetJoinColumn,
      targetInverseJoinColumn: options.targetInverseJoinColumn,
      joinTable: options.joinTable,
    };
  }

  /**
   * Unique check function to avoid duplicate metadata entries.
   * @param existing - The existing metadata.
   * @param newEntry - The new metadata to add.
   * @returns boolean - Whether the metadata is unique.
   */
  private isUnique(
    existing: OneToOneMetadata,
    newEntry: OneToOneMetadata,
  ): boolean {
    return existing.propertyKey === newEntry.propertyKey;
  }

  /**
   * Decorator method to add one-to-one relationship metadata to the entity.
   * @param options - Configuration options for the one-to-one relationship.
   * @returns PropertyDecorator
   */
  public decorate(options: Partial<OneToOneMetadata>): PropertyDecorator {
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

// Instance of OneToOneDecorator
const oneToOneDecoratorInstance = new OneToOneDecorator();

/**
 * @OneToOne decorator to define a one-to-one relationship between entities.
 * @param options - Configuration options for the relationship.
 * @returns PropertyDecorator
 */
export const OneToOne = (
  options: Partial<OneToOneMetadata>,
): PropertyDecorator => {
  return oneToOneDecoratorInstance.decorate(options);
};

/**
 * Retrieves one-to-one relations metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns OneToOneMetadata[]
 */
export const getOneToOneMetadata = (target: any): OneToOneMetadata[] => {
  const metadataManager = new MetadataManager(); // Create an instance of MetadataManager
  return metadataManager.getMetadata(
    target.constructor,
    'oneToOneRelations',
  ) as OneToOneMetadata[];
};
