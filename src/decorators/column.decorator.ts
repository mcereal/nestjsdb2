// src/decorators/column.decorator.ts

import { ColumnOptions, ColumnMetadata } from '../interfaces';
import { EntityMetadataStorage, EntityMetadata } from '../metadata';

/**
 * @Column decorator to define a database column.
 * @param options - Configuration options for the column.
 * @returns PropertyDecorator
 */
export const Column = (options: ColumnOptions): PropertyDecorator => {
  if (!options.type || typeof options.type !== 'string') {
    throw new Error('Column type must be a non-empty string.');
  }

  return (target: Object, propertyKey: string | symbol) => {
    const constructor = target.constructor as new (...args: any[]) => any;

    // Retrieve existing entity metadata or create a new one
    let entityMetadata: EntityMetadata =
      EntityMetadataStorage.getEntityMetadata(constructor);

    // If no metadata exists, initialize a new one
    if (!entityMetadata) {
      entityMetadata = {
        tableName: '',
        columns: [],
        primaryKeys: [],
        uniqueColumns: [],
        indexedColumns: [],
        foreignKeys: [],
        oneToOneRelations: [],
        oneToManyRelations: [],
        manyToOneRelations: [],
        manyToManyRelations: [],
        defaultValues: [],
        checkConstraints: [],
        compositeKeys: [],
        uniqueColumnMetadada: [],
      };
    }

    // Add new column metadata
    const columnMetadata: ColumnMetadata = {
      propertyKey,
      options: {
        type: options.type,
        length: options.length,
        nullable: options.nullable,
        default: options.default,
      },
    };

    entityMetadata.columns.push(columnMetadata);

    // Store updated metadata
    EntityMetadataStorage.setEntityMetadata(constructor, entityMetadata);
  };
};

/**
 * Function to retrieve column metadata for a given class
 * @param target - The constructor of the entity class.
 * @returns ColumnMetadata[]
 */
export const getColumnMetadata = (target: any): ColumnMetadata[] => {
  const entityMetadata = EntityMetadataStorage.getEntityMetadata(target);
  return entityMetadata ? entityMetadata.columns : [];
};
