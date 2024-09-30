// src/decorators/foreignKey.decorator.ts

import { MetadataManager, MetadataType } from '../metadata/metadata-manager';
import { ForeignKeyMetadata } from '../interfaces';
import { ClassConstructor } from '../types';

/**
 * ForeignKeyDecorator class to handle foreign key metadata using MetadataManager.
 */
class ForeignKeyDecorator {
  private metadataType: MetadataType = 'foreignKeys';
  private metadataManager: MetadataManager;

  constructor() {
    this.metadataManager = new MetadataManager(); // Instantiate MetadataManager
  }

  /**
   * Validation function for foreign key options.
   * @param options - The options to validate.
   */
  private validateOptions(options: Partial<ForeignKeyMetadata>): void {
    // Validate that the reference is a properly formatted string
    if (
      typeof options.reference !== 'string' ||
      !options.reference.includes('(') ||
      !options.reference.includes(')')
    ) {
      throw new Error(
        "ForeignKey decorator requires a 'reference' string in the format 'referenced_table(referenced_column)'.",
      );
    }

    // Validate that the onDelete option, if provided, is one of the allowed values
    if (
      options.onDelete &&
      !['CASCADE', 'SET NULL', 'RESTRICT'].includes(options.onDelete)
    ) {
      throw new Error(
        "ForeignKey decorator 'onDelete' option must be 'CASCADE', 'SET NULL', or 'RESTRICT'.",
      );
    }

    // Validate that the onUpdate option, if provided, is one of the allowed values
    if (
      options.onUpdate &&
      !['CASCADE', 'SET NULL', 'RESTRICT'].includes(options.onUpdate)
    ) {
      throw new Error(
        "ForeignKey decorator 'onUpdate' option must be 'CASCADE', 'SET NULL', or 'RESTRICT'.",
      );
    }
  }

  /**
   * Metadata creation function.
   * @param propertyKey - The property key of the metadata.
   * @param options - The options for creating the metadata.
   * @returns ForeignKeyMetadata
   */
  private createMetadata(
    propertyKey: string | symbol,
    options: Partial<ForeignKeyMetadata>,
  ): ForeignKeyMetadata {
    return {
      propertyKey,
      reference: options.reference!,
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
    existing: ForeignKeyMetadata,
    newEntry: ForeignKeyMetadata,
  ): boolean {
    return (
      existing.propertyKey === newEntry.propertyKey &&
      existing.reference === newEntry.reference
    );
  }

  /**
   * Decorator method to add foreign key metadata to the entity.
   * @param options - Configuration options for the foreign key.
   * @returns PropertyDecorator
   */
  public decorate(options: Partial<ForeignKeyMetadata>): PropertyDecorator {
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

// Instance of ForeignKeyDecorator
const foreignKeyDecoratorInstance = new ForeignKeyDecorator();

/**
 * @ForeignKey decorator to define a foreign key relationship.
 * @param options - Configuration options for the foreign key.
 * @returns PropertyDecorator
 */
export const ForeignKey = (
  options: Partial<ForeignKeyMetadata>,
): PropertyDecorator => {
  return foreignKeyDecoratorInstance.decorate(options);
};

/**
 * Retrieves foreign key metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns ForeignKeyMetadata[]
 */
export const getForeignKeyMetadata = (target: any): ForeignKeyMetadata[] => {
  const metadataManager = new MetadataManager(); // Create an instance of MetadataManager
  return metadataManager.getMetadata(
    target.constructor,
    'foreignKeys',
  ) as ForeignKeyMetadata[];
};
