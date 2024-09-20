// src/decorators/foreign-key.decorator.ts

import 'reflect-metadata';
import { ForeignKeyMetadata, ForeignKeyOptions } from '../metadata';
import { FOREIGN_KEYS_METADATA_KEY } from '../types';

/**
 * @ForeignKey decorator to define a foreign key relationship.
 * @param options - Configuration options for the foreign key.
 * @returns PropertyDecorator
 */
export function ForeignKey(options: ForeignKeyOptions): PropertyDecorator {
  // Validate options
  if (
    typeof options.reference !== 'string' ||
    !options.reference.includes('(') ||
    !options.reference.includes(')')
  ) {
    throw new Error(
      "ForeignKey decorator requires a 'reference' string in the format 'referenced_table(referenced_column)'.",
    );
  }

  if (
    options.onDelete &&
    !['CASCADE', 'SET NULL', 'RESTRICT'].includes(options.onDelete)
  ) {
    throw new Error(
      "ForeignKey decorator 'onDelete' option must be 'CASCADE', 'SET NULL', or 'RESTRICT'.",
    );
  }

  return (
    target: new (...args: any[]) => any,
    propertyKey: string | symbol,
  ) => {
    const constructor = target.constructor;

    // Retrieve existing foreign keys metadata or initialize if none exists
    const foreignKeys: ForeignKeyMetadata[] =
      Reflect.getMetadata(FOREIGN_KEYS_METADATA_KEY, constructor) || [];

    // Add new foreign key metadata
    foreignKeys.push({ propertyKey, foreignKeyOptions: options });

    // Define or update metadata with the new foreign keys array
    Reflect.defineMetadata(FOREIGN_KEYS_METADATA_KEY, foreignKeys, constructor);
  };
}
