// src/decorators/column.decorator.ts
import { BaseDecorator } from './base.decorator';
import { ColumnMetadata } from '../interfaces/entity-decorators.interface';

/**
 * ColumnDecorator class that extends BaseDecorator to handle column metadata.
 */
class ColumnDecorator extends BaseDecorator<Partial<ColumnMetadata>> {
  constructor() {
    super(
      'columns',
      // Validation function for the column options
      (options: Partial<ColumnMetadata>) => {
        if (!options.type) {
          throw new Error('Column decorator requires a "type" option.');
        }
      },
      // Metadata creation function for the column
      (propertyKey, options) => {
        return {
          propertyKey: propertyKey.toString(),
          type: options.type,
          length: options.length,
          nullable: options.nullable,
          default: options.default,
          unique: options.unique,
          primary: options.primary,
          autoIncrement: options.autoIncrement,
          onUpdate: options.onUpdate,
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
          generated: options.generated,
          asExpression: options.asExpression,
          virtual: options.virtual,
          stored: options.stored,
          hidden: options.hidden,
          defaultToNow: options.defaultToNow,
          defaultToNowOnUpdate: options.defaultToNowOnUpdate,
          defaultToUUID: options.defaultToUUID,
        } as ColumnMetadata;
      },
    );
  }

  // No need to implement createClassMetadata for columns as it's a property decorator
  protected createClassMetadata(target: Function): void {
    target;
    return;
  }
}

// Instance of ColumnDecorator
const columnDecoratorInstance = new ColumnDecorator();

/**
 * @Column decorator to define a database column.
 * @param options - The column options.
 * @returns PropertyDecorator
 */
export const Column = (options: Partial<ColumnMetadata>): PropertyDecorator => {
  return columnDecoratorInstance.decorate(options) as PropertyDecorator;
};
