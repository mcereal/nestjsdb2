// src/decorators/foreignKey.decorator.ts
import { BaseDecorator } from './base.decorator';
import { ForeignKeyMetadata } from '../interfaces';
import { getMetadata } from './utils';

/**
 * ForeignKeyDecorator class that extends BaseDecorator to handle foreign key metadata.
 */
class ForeignKeyDecorator extends BaseDecorator<Partial<ForeignKeyMetadata>> {
  constructor() {
    super(
      'foreignKeys',
      // Validation function for foreign key options
      (options: Partial<ForeignKeyMetadata>) => {
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
      },
      // Metadata creation function for the foreign key
      (propertyKey, options) => {
        return {
          propertyKey,
          reference: options.reference,
          onDelete: options.onDelete,
          onUpdate: options.onUpdate,
          name: options.name,
          constraintName: options.constraintName,
          comment: options.comment,
          invisible: options.invisible,
          functional: options.functional,
          expression: options.expression,
          include: options.include,
        } as ForeignKeyMetadata;
      },
    );
  }

  // No need to implement createClassMetadata for foreign keys as it's a property decorator
  protected createClassMetadata(target: Function): void {
    target;
    return;
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
  return foreignKeyDecoratorInstance.decorate(options) as PropertyDecorator;
};

/**
 * Retrieves foreign key metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns ForeignKeyMetadata[]
 */
export const getForeignKeyMetadata = (target: any): ForeignKeyMetadata[] => {
  return getMetadata<ForeignKeyMetadata>(target, 'foreignKeys');
};
