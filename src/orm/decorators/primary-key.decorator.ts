// src/decorators/primary-key.decorator.ts

import { BasePropertyDecorator } from './base-property.decorator';
import { PrimaryKeyMetadata } from '../interfaces';

/**
 * PrimaryKeyDecorator class that extends BasePropertyDecorator to handle primary key metadata.
 */
class PrimaryKeyDecorator extends BasePropertyDecorator<
  Partial<PrimaryKeyMetadata>
> {
  constructor() {
    super(
      'primaryKeys', // MetadataType
      // Validation function for the primary key options
      (options: Partial<PrimaryKeyMetadata>) => {
        if (!options.type) {
          throw new Error('Primary key decorator requires a "type" option.');
        }
      },
      // Metadata Creator
      (propertyKey, options) => ({
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
      }),
      // Unique Check Function (optional)
      (existing: PrimaryKeyMetadata, newEntry: PrimaryKeyMetadata) =>
        existing.propertyKey === newEntry.propertyKey,
    );
  }

  // No need to implement createClassMetadata as it's a property decorator
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
  return (target: Object, propertyKey: string | symbol) => {
    primaryKeyDecoratorInstance.decorate(options)(target, propertyKey);
  };
};
