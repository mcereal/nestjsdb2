// src/decorators/primary-key.decorator.ts

import { BasePropertyDecorator } from './base-property.decorator';
import { PrimaryKeyMetadata, ColumnMetadata } from '../interfaces';
import { ClassConstructor } from '../types';

/**
 * PrimaryKeyDecorator class that extends BasePropertyDecorator to handle primary key metadata
 * and simultaneously registers the primary key as a column.
 */
class PrimaryKeyDecorator extends BasePropertyDecorator<
  Partial<PrimaryKeyMetadata>
> {
  constructor() {
    super(
      'primaryKeys', // Use string literal instead of MetadataType.primaryKeys
      // Validation function for the primary key options
      (options: Partial<PrimaryKeyMetadata>) => {
        if (!options.type) {
          throw new Error('Primary key decorator requires a "type" option.');
        }
      },
      // Metadata Creator for primary keys
      (propertyKey, options) => ({
        propertyKey: propertyKey.toString(),
        name: options.name,
        type: options.type,
        autoIncrement: options.autoIncrement,
        nullable: options.nullable,
        // Include other properties as needed
      }),
      // Unique Check Function (optional)
      (existing: PrimaryKeyMetadata, newEntry: PrimaryKeyMetadata) =>
        existing.propertyKey === newEntry.propertyKey,
    );
  }

  /**
   * Override the decorate method to also add column metadata.
   * @param options - The primary key options.
   * @returns PropertyDecorator
   */
  decorate(options: Partial<PrimaryKeyMetadata>): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol) => {
      // First, decorate as primary key
      super.decorate(options)(target, propertyKey);

      // Then, register the same property as a column
      const columnOptions: Partial<ColumnMetadata> = {
        propertyKey: propertyKey.toString(),
        name: options.name || propertyKey.toString(),
        type: options.type || 'integer', // Default type if not provided
        nullable: options.nullable !== undefined ? options.nullable : false,
        // Include other relevant column options as needed
      };

      // Add column metadata
      this.metadataManager.addMetadata(
        target.constructor as ClassConstructor,
        'columns', // Use string literal instead of MetadataType.columns
        columnOptions,
        (existing: ColumnMetadata, newEntry: ColumnMetadata) =>
          existing.propertyKey === newEntry.propertyKey,
      );
    };
  }
}

// Instance of PrimaryKeyDecorator
const primaryKeyDecoratorInstance = new PrimaryKeyDecorator();

/**
 * @PrimaryKey decorator to define a primary key column.
 * It registers both primary key metadata and column metadata.
 * @param options - The primary key options.
 * @returns PropertyDecorator
 */
export const PrimaryKey = (
  options: Partial<PrimaryKeyMetadata>,
): PropertyDecorator => {
  return (target: Object, propertyKey: string | symbol) => {
    primaryKeyDecoratorInstance.decorate(options)(target, propertyKey);
  };
};
