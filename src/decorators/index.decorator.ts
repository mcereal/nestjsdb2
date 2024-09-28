// src/decorators/index.decorator.ts
import { BaseDecorator } from './base.decorator';
import { IndexedColumnMetadata } from '../interfaces';
import { getMetadata } from './utils';

/**
 * IndexDecorator class that extends BaseDecorator to handle index metadata.
 */
class IndexDecorator extends BaseDecorator<Partial<IndexedColumnMetadata>> {
  constructor() {
    super(
      'indexedColumns',
      // Validation function for the index options
      (options: Partial<IndexedColumnMetadata>) => {
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
      },
      // Metadata creation function for the index
      (propertyKey, options) => {
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
        } as IndexedColumnMetadata;
      },
      // Unique check function to ensure the property key is unique within indexed columns
      (existing: IndexedColumnMetadata, newEntry: IndexedColumnMetadata) =>
        existing.propertyKey === newEntry.propertyKey,
    );
  }

  // No need to implement createClassMetadata for indexes as it's a property decorator
  protected createClassMetadata(target: Function): void {
    target;
    return;
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
  return indexDecoratorInstance.decorate(options) as PropertyDecorator;
};

/**
 * Retrieves index metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns IndexedColumnMetadata[]
 */
export const getIndexMetadata = (target: any): IndexedColumnMetadata[] => {
  return getMetadata<IndexedColumnMetadata>(target, 'indexedColumns');
};
