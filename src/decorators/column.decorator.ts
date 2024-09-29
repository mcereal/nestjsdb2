// src/decorators/column.decorator.ts

import { BasePropertyDecorator } from './base-property.decorator';
import { ColumnMetadata } from '../interfaces/entity-decorators.interface';

/**
 * ColumnDecorator class that extends BasePropertyDecorator to handle column metadata.
 */
class ColumnDecorator extends BasePropertyDecorator<Partial<ColumnMetadata>> {
  constructor() {
    super(
      'columns', // MetadataType
      // Options Validator
      (options: Partial<ColumnMetadata>) => {
        if (!options.type) {
          throw new Error('Column decorator requires a "type" option.');
        }
        // Additional validations can be added here as needed
      },
      // Metadata Creator
      (propertyKey, options) => ({
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
      }),
      // Unique Check Function (optional)
      (existing: ColumnMetadata, newEntry: ColumnMetadata) =>
        existing.propertyKey === newEntry.propertyKey,
    );
  }

  // No need to implement createClassMetadata as it's a property decorator
}

// Instance of ColumnDecorator
const columnDecoratorInstance = new ColumnDecorator();

/**
 * @Column decorator to define a database column.
 * @param options - The column options.
 * @returns PropertyDecorator
 */
export const Column = (options: Partial<ColumnMetadata>): PropertyDecorator => {
  return (target: Object, propertyKey: string | symbol) => {
    columnDecoratorInstance.decorate({
      ...options,
      propertyKey: propertyKey.toString(),
    })(target, propertyKey);
  };
};
