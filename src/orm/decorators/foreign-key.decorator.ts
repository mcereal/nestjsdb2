// src/decorators/foreign-key.decorator.ts

import { BasePropertyDecorator } from './base-property.decorator';
import { ForeignKeyMetadata, ColumnMetadata } from '../interfaces';
import { MetadataType } from '../metadata/metadata-manager';
import { ClassConstructor } from '../types';

/**
 * ForeignKeyDecorator class that extends BasePropertyDecorator to handle foreign key metadata
 * and simultaneously registers the foreign key as a column.
 */
class ForeignKeyDecorator extends BasePropertyDecorator<
  Partial<ForeignKeyMetadata>
> {
  constructor() {
    super(
      'foreignKeys', // Use string literal
      // Validation function for the foreign key options
      (options: Partial<ForeignKeyMetadata>) => {
        if (!options.target) {
          throw new Error('Foreign key decorator requires a "target" option.');
        }
        if (!options.referencedTable) {
          throw new Error(
            'Foreign key decorator requires a "referencedTable" option.',
          );
        }
        if (
          !options.referencedColumnNames ||
          options.referencedColumnNames.length === 0
        ) {
          throw new Error(
            'Foreign key decorator requires "referencedColumnNames" option with at least one column.',
          );
        }
      },
      // Metadata Creator for foreign keys
      (propertyKey, options) => ({
        propertyKey: propertyKey.toString(),
        name: options.name,
        target: options.target,
        referencedTable: options.referencedTable,
        referencedColumnNames: options.referencedColumnNames,
        onDelete: options.onDelete,
        onUpdate: options.onUpdate,
        // Include other properties as needed
      }),
      // Unique Check Function (optional)
      (existing: ForeignKeyMetadata, newEntry: ForeignKeyMetadata) =>
        existing.propertyKey === newEntry.propertyKey,
    );
  }

  /**
   * Override the decorate method to also add column metadata.
   * @param options - The foreign key options.
   * @returns PropertyDecorator
   */
  decorate(options: Partial<ForeignKeyMetadata>): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol) => {
      // First, decorate as foreign key
      super.decorate(options)(target, propertyKey);

      // Then, register the same property as a column
      const columnOptions: Partial<ColumnMetadata> = {
        propertyKey: propertyKey.toString(),
        name: options.name || propertyKey.toString(),
        type: options.type || 'integer', // Default type if not provided
        nullable: options.nullable !== undefined ? options.nullable : true,
        // Include other relevant column options as needed
      };

      // Add column metadata
      this.metadataManager.addMetadata(
        target.constructor as ClassConstructor,
        'columns', // Use string literal
        columnOptions,
        (existing: ColumnMetadata, newEntry: ColumnMetadata) =>
          existing.propertyKey === newEntry.propertyKey,
      );
    };
  }
}

// Instance of ForeignKeyDecorator
const foreignKeyDecoratorInstance = new ForeignKeyDecorator();

/**
 * @ForeignKey decorator to define a foreign key column.
 * It registers both foreign key metadata and column metadata.
 * @param options - The foreign key options.
 * @returns PropertyDecorator
 */
export const ForeignKey = (
  options: Partial<ForeignKeyMetadata>,
): PropertyDecorator => {
  return (target: Object, propertyKey: string | symbol) => {
    foreignKeyDecoratorInstance.decorate(options)(target, propertyKey);
  };
};
