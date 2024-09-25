import { UniqueColumnMetadata } from '../interfaces';
import { EntityMetadataStorage, EntityMetadata } from '../metadata';
import { UniqueColumnMetadataOptions } from '../interfaces';

/**
 * @Unique decorator to mark a property as unique in the database.
 * @param options - Configuration options for the unique column.
 * @returns PropertyDecorator
 */
export const Unique = (
  options: UniqueColumnMetadataOptions,
): PropertyDecorator => {
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

    // Check if the property key is already marked as unique
    const existingColumn = entityMetadata.uniqueColumns.find(
      (column) => column.propertyKey === propertyKey,
    );

    if (!existingColumn) {
      // Add new unique column metadata
      const uniqueColumnMetadata: UniqueColumnMetadata = {
        propertyKey,
        options,
      };
      entityMetadata.uniqueColumns.push(uniqueColumnMetadata);

      // Store the updated unique columns metadata in the EntityMetadataStorage
      EntityMetadataStorage.setEntityMetadata(constructor, entityMetadata);
    }
  };
};

/**
 * Function to retrieve unique column metadata for a given class
 * @param target - The constructor of the entity class.
 * @returns UniqueColumnMetadata[]
 */
export const getUniqueColumnMetadata = (
  target: any,
): UniqueColumnMetadata[] => {
  const entityMetadata = EntityMetadataStorage.getEntityMetadata(target);
  return entityMetadata ? entityMetadata.uniqueColumns : [];
};
