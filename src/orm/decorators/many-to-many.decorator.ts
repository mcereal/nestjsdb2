// src/decorators/manyToMany.decorator.ts

import { MetadataManager, MetadataType } from '../metadata/metadata-manager';
import { ManyToManyMetadata } from '../interfaces';
import { ClassConstructor } from '../types';

/**
 * ManyToManyDecorator class to handle many-to-many relationship metadata using MetadataManager.
 */
class ManyToManyDecorator {
  private metadataType: MetadataType = 'manyToManyRelations';
  private metadataManager: MetadataManager;

  constructor() {
    this.metadataManager = new MetadataManager(); // Instantiate MetadataManager
  }

  /**
   * Validation function for the options.
   * @param options - The options to validate.
   */
  private validateOptions(options: ManyToManyMetadata): void {
    if (typeof options.target !== 'function') {
      throw new Error(
        "ManyToMany decorator requires a 'target' option that is a constructor function of the target entity.",
      );
    }
    if (options.joinTable && typeof options.joinTable !== 'string') {
      throw new Error(
        "ManyToMany decorator 'joinTable' option must be a string if provided.",
      );
    }
    if (options.joinColumn && typeof options.joinColumn !== 'string') {
      throw new Error(
        "ManyToMany decorator 'joinColumn' option must be a string if provided.",
      );
    }
    if (
      options.inverseJoinColumn &&
      typeof options.inverseJoinColumn !== 'string'
    ) {
      throw new Error(
        "ManyToMany decorator 'inverseJoinColumn' option must be a string if provided.",
      );
    }
    // Add more validations as needed
  }

  /**
   * Metadata creation function.
   * @param propertyKey - The property key of the metadata.
   * @param options - The options for creating the metadata.
   * @returns ManyToManyMetadata
   */
  private createMetadata(
    propertyKey: string | symbol,
    options: ManyToManyMetadata,
  ): ManyToManyMetadata {
    return {
      propertyKey,
      target: options.target,
      joinTable: options.joinTable,
      cascade: options.cascade,
      joinColumn: options.joinColumn,
      inverseJoinColumn: options.inverseJoinColumn,
      sourceJoinColumn: options.sourceJoinColumn,
      sourceInverseJoinColumn: options.sourceInverseJoinColumn,
      targetJoinColumn: options.targetJoinColumn,
      targetInverseJoinColumn: options.targetInverseJoinColumn,
    };
  }

  /**
   * Unique check function to avoid duplicate metadata entries.
   * @param existing - The existing metadata.
   * @param newEntry - The new metadata to add.
   * @returns boolean - Whether the metadata is unique.
   */
  private isUnique(
    existing: ManyToManyMetadata,
    newEntry: ManyToManyMetadata,
  ): boolean {
    return existing.propertyKey === newEntry.propertyKey;
  }

  /**
   * Decorator method to add many-to-many relationship metadata to the entity.
   * @param options - Configuration options for the many-to-many relationship.
   * @returns PropertyDecorator
   */
  public decorate(options: ManyToManyMetadata): PropertyDecorator {
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

// Instance of ManyToManyDecorator
const manyToManyDecoratorInstance = new ManyToManyDecorator();

/**
 * @ManyToMany decorator to define a many-to-many relationship between entities.
 * @param options - Configuration options for the many-to-many relationship.
 * @returns PropertyDecorator
 */
export const ManyToMany = (
  options: Omit<ManyToManyMetadata, 'propertyKey'>,
): PropertyDecorator => {
  return manyToManyDecoratorInstance.decorate({
    ...options,
    propertyKey: '', // propertyKey will be set later in the decorator method
  });
};

/**
 * Retrieves many-to-many relations metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns ManyToManyMetadata[]
 */
export const getManyToManyMetadata = (target: any): ManyToManyMetadata[] => {
  const metadataManager = new MetadataManager(); // Create an instance of MetadataManager
  return metadataManager.getMetadata(
    target.constructor,
    'manyToManyRelations',
  ) as ManyToManyMetadata[];
};
