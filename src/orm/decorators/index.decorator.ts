// src/decorators/index.decorator.ts

import { MetadataManager, MetadataType } from '../metadata/metadata-manager';
import { IndexedColumnMetadata } from '../interfaces';
import { ClassConstructor } from '../types';

/**
 * IndexDecorator class to handle index metadata using MetadataManager.
 */
class IndexDecorator {
  private metadataType: MetadataType = 'indexedColumns';
  private metadataManager: MetadataManager;

  constructor() {
    this.metadataManager = new MetadataManager(); // Instantiate MetadataManager
  }

  /**
   * Validation function for the index options.
   * @param options - The options to validate.
   */
  private validateOptions(options: Partial<IndexedColumnMetadata>): void {
    if (
      options.type &&
      !['BTREE', 'FULLTEXT', 'HASH', 'SPATIAL'].includes(options.type)
    ) {
      throw new Error(
        "Index 'type' must be one of: 'BTREE', 'FULLTEXT', 'HASH', 'SPATIAL'.",
      );
    }
    if (options.method && !['BTREE', 'HASH'].includes(options.method)) {
      throw new Error("Index 'method' must be one of: 'BTREE', 'HASH'.");
    }
    if (
      options.algorithm &&
      !['DEFAULT', 'INPLACE', 'COPY', 'NOCOPY'].includes(options.algorithm)
    ) {
      throw new Error(
        "Index 'algorithm' must be one of: 'DEFAULT', 'INPLACE', 'COPY', 'NOCOPY'.",
      );
    }
  }

  /**
   * Metadata creation function.
   * @param propertyKey - The property key of the metadata.
   * @param options - The options for creating the metadata.
   * @returns IndexedColumnMetadata
   */
  private createMetadata(
    propertyKey: string | symbol,
    options: Partial<IndexedColumnMetadata>,
  ): IndexedColumnMetadata {
    return {
      propertyKey,
      name: options.name || propertyKey.toString(),
      unique: options.unique || false,
      nullable: options.nullable,
      default: options.default,
      onUpdate: options.onUpdate,
      type: options.type,
      method: options.method,
      algorithm: options.algorithm,
      parser: options.parser,
      comment: options.comment,
      invisible: options.invisible,
      functional: options.functional,
      expression: options.expression,
      include: options.include,
      prefixLength: options.prefixLength,
    };
  }

  /**
   * Unique check function to avoid duplicate metadata entries.
   * @param existing - The existing metadata.
   * @param newEntry - The new metadata to add.
   * @returns boolean - Whether the metadata is unique.
   */
  private isUnique(
    existing: IndexedColumnMetadata,
    newEntry: IndexedColumnMetadata,
  ): boolean {
    return existing.propertyKey === newEntry.propertyKey;
  }

  /**
   * Decorator method to add index metadata to the entity.
   * @param options - Optional configuration options for the index.
   * @returns PropertyDecorator
   */
  public decorate(options: Partial<IndexedColumnMetadata>): PropertyDecorator {
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

// Instance of IndexDecorator
const indexDecoratorInstance = new IndexDecorator();

/**
 * @Index decorator to mark a property as indexed.
 * @param options - Optional configuration options for the index.
 * @returns PropertyDecorator
 */
export const Index = (
  options: Partial<IndexedColumnMetadata> = {},
): PropertyDecorator => {
  return indexDecoratorInstance.decorate(options);
};

/**
 * Retrieves index metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns IndexedColumnMetadata[]
 */
export const getIndexMetadata = (target: any): IndexedColumnMetadata[] => {
  const metadataManager = new MetadataManager(); // Create an instance of MetadataManager
  return metadataManager.getMetadata(
    target.constructor,
    'indexedColumns',
  ) as IndexedColumnMetadata[];
};
