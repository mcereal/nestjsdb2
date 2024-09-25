import { IndexedColumnMetadata } from '../interfaces';
import { EntityMetadataStorage, EntityMetadata } from '../metadata';

/**
 * @Index decorator to mark a property as indexed.
 * Can be extended with additional options if needed.
 * @returns PropertyDecorator
 */
export const Index = (): PropertyDecorator => {
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

    // Check if the property is already marked as indexed to avoid duplicates
    const isAlreadyIndexed = entityMetadata.indexedColumns.some(
      (index) => index.propertyKey === propertyKey,
    );

    if (!isAlreadyIndexed) {
      // Add new index metadata
      const indexMetadata: IndexedColumnMetadata = {
        propertyKey,
        options: {
          name: '', // Default to empty string
          unique: false, // Default to non-unique index
        },
      };
      entityMetadata.indexedColumns.push(indexMetadata);

      // Store the updated metadata in the EntityMetadataStorage
      EntityMetadataStorage.setEntityMetadata(constructor, entityMetadata);
    }
  };
};

/**
 * Function to retrieve index metadata for a given class
 * @param target - The constructor of the entity class.
 * @returns IndexMetadata[]
 */
export const getIndexMetadata = (target: any): IndexedColumnMetadata[] => {
  const entityMetadata = EntityMetadataStorage.getEntityMetadata(target);
  return entityMetadata ? entityMetadata.indexedColumns : [];
};
