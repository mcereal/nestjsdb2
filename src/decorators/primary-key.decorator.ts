import { PrimaryKeyMetadata } from '../interfaces';
import { EntityMetadataStorage, EntityMetadata } from '../metadata';
import { primeKeyOptions } from '../interfaces';

/**
 * @PrimaryKey decorator to mark a property as a primary key.
 * @param options - Optional configuration options for the primary key.
 * @returns PropertyDecorator
 */
export const PrimaryKey = (options?: primeKeyOptions): PropertyDecorator => {
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

    // Check if the property key is already marked as a primary key
    const existingKey = entityMetadata.primaryKeys.find(
      (key) => key.propertyKey === propertyKey,
    );

    if (!existingKey) {
      // Add new primary key metadata
      const primaryKeyMetadata: PrimaryKeyMetadata = {
        propertyKey,
        options: options || {},
      };
      entityMetadata.primaryKeys.push(primaryKeyMetadata);

      // Store the updated primary keys metadata in the EntityMetadataStorage
      EntityMetadataStorage.setEntityMetadata(constructor, entityMetadata);
    }
  };
};

/**
 * Function to retrieve primary keys metadata for a given class
 * @param target - The constructor of the entity class.
 * @returns PrimaryKeyMetadata[]
 */
export const getPrimaryKeyMetadata = (target: any): PrimaryKeyMetadata[] => {
  const entityMetadata = EntityMetadataStorage.getEntityMetadata(target);
  return entityMetadata ? entityMetadata.primaryKeys : [];
};
