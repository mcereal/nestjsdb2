// src/decorators/primary-key.decorator.ts
import { BaseDecorator } from './base.decorator';
import { PrimaryKeyMetadata } from '../interfaces';

/**
 * PrimaryKeyDecorator class that extends BaseDecorator to handle primary key metadata.
 */
class PrimaryKeyDecorator extends BaseDecorator<Partial<PrimaryKeyMetadata>> {
  constructor() {
    super(
      'primaryKeys',
      // Validation function for the primary key options
      (options: Partial<PrimaryKeyMetadata>) => {
        if (!options.type) {
          throw new Error('Primary key decorator requires a "type" option.');
        }
      },
      // Metadata creation function for the primary key
      (propertyKey, options) => {
        return {
          propertyKey: propertyKey.toString(),
          name: options.name,
          length: options.length,
          type: options.type,
          generated: options.generated,
          unique: options.unique,
          nullable: options.nullable,
          default: options.default,
          onUpdate: options.onUpdate,
          autoIncrement: options.autoIncrement,
          comment: options.comment,
          collation: options.collation,
          charset: options.charset,
          precision: options.precision,
          scale: options.scale,
          zerofill: options.zerofill,
          unsigned: options.unsigned,
          spatial: options.spatial,
          srid: options.srid,
          geometryType: options.geometryType,
          geometrySrid: options.geometrySrid,
          geometryDimension: options.geometryDimension,
          geometryTypeComment: options.geometryTypeComment,
          enum: options.enum,
          set: options.set,
          asExpression: options.asExpression,
          virtual: options.virtual,
          stored: options.stored,
          hidden: options.hidden,
          defaultToNow: options.defaultToNow,
          defaultToNowOnUpdate: options.defaultToNowOnUpdate,
          defaultToUUID: options.defaultToUUID,
        } as PrimaryKeyMetadata;
      },
    );
  }

  // No need to implement createClassMetadata for primary keys as it's a property decorator
  protected createClassMetadata(target: Function): void {
    target;
    return;
  }
}

// Instance of PrimaryKeyDecorator
const primaryKeyDecoratorInstance = new PrimaryKeyDecorator();

/**
 * @PrimaryKey decorator to define a primary key column.
 * @param options - The primary key options.
 * @returns PropertyDecorator
 */
export const PrimaryKey = (
  options: Partial<PrimaryKeyMetadata>,
): PropertyDecorator => {
  return primaryKeyDecoratorInstance.decorate(options) as PropertyDecorator;
};
