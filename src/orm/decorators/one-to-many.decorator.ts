// src/decorators/oneToMany.decorator.ts

import { MetadataManager, MetadataType } from '../metadata/metadata-manager';
import { OneToManyMetadata } from '../interfaces';
import { ClassConstructor } from '../types';

/**
 * OneToManyDecorator class to handle one-to-many relationship metadata using MetadataManager.
 */
class OneToManyDecorator {
  private metadataType: MetadataType = 'oneToManyRelations';
  private metadataManager: MetadataManager;

  constructor() {
    this.metadataManager = new MetadataManager(); // Instantiate MetadataManager
  }

  /**
   * Validation function for the OneToMany options.
   * @param options - The options to validate.
   */
  private validateOptions(options: Partial<OneToManyMetadata>): void {
    if (typeof options.target !== 'function') {
      throw new Error(
        "OneToMany decorator requires a 'target' option that is a function (constructor of the target entity).",
      );
    }
    // Additional validations can be added here if needed
  }

  /**
   * Metadata creation function.
   * @param propertyKey - The property key of the metadata.
   * @param options - The options for creating the metadata.
   * @returns OneToManyMetadata
   */
  private createMetadata(
    propertyKey: string | symbol,
    options: Partial<OneToManyMetadata>,
  ): OneToManyMetadata {
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
    existing: OneToManyMetadata,
    newEntry: OneToManyMetadata,
  ): boolean {
    return existing.propertyKey === newEntry.propertyKey;
  }

  /**
   * Decorator method to add one-to-many relationship metadata to the entity.
   * @param options - Configuration options for the one-to-many relationship.
   * @returns PropertyDecorator
   */
  public decorate(options: Partial<OneToManyMetadata>): PropertyDecorator {
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

// Instance of OneToManyDecorator
const oneToManyDecoratorInstance = new OneToManyDecorator();

/**
 * @OneToMany decorator to define a one-to-many relationship between entities.
 * @param options - Configuration options for the relationship.
 * @returns PropertyDecorator
 */
export const OneToMany = (
  options: Partial<OneToManyMetadata>,
): PropertyDecorator => {
  return oneToManyDecoratorInstance.decorate(options);
};

/**
 * Retrieves one-to-many relations metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns OneToManyMetadata[]
 */
export const getOneToManyMetadata = (target: any): OneToManyMetadata[] => {
  const metadataManager = new MetadataManager(); // Create an instance of MetadataManager
  return metadataManager.getMetadata(
    target.constructor,
    'oneToManyRelations',
  ) as OneToManyMetadata[];
};
