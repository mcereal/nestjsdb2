// src/decorators/check.decorator.ts

import { CheckConstraintMetadata } from '../interfaces';
import { EntityMetadataStorage, EntityMetadata } from '../metadata';

/**
 * @Check decorator to define a check constraint for a database column.
 * @param constraint - The SQL check constraint as a string.
 * @returns PropertyDecorator
 */
export const Check = (constraint: string): PropertyDecorator => {
  if (typeof constraint !== 'string' || constraint.trim().length === 0) {
    throw new Error('Check constraint must be a non-empty string.');
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

    // Add new check constraint metadata
    const checkConstraint: CheckConstraintMetadata = {
      propertyKey,
      constraint,
    };

    entityMetadata.checkConstraints.push(checkConstraint);

    // Store updated metadata
    EntityMetadataStorage.setEntityMetadata(constructor, entityMetadata);
  };
};

/**
 * Function to retrieve check constraint metadata for a given class
 * @param target - The constructor of the entity class.
 * @returns CheckConstraintMetadata[]
 */
export const getCheckConstraints = (target: any): CheckConstraintMetadata[] => {
  const entityMetadata = EntityMetadataStorage.getEntityMetadata(target);
  return entityMetadata ? entityMetadata.checkConstraints : [];
};
