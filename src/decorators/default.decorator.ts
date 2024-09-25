import { DefaultMetadata } from '../interfaces';
import { EntityMetadataStorage, EntityMetadata } from '../metadata';

/**
 * @Default decorator to define a default value for a database column.
 * @param value - The default value to set.
 * @returns PropertyDecorator
 */
export const Default = (value: any): PropertyDecorator => {
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

    // Check if the propertyKey already exists in the default values metadata
    const existingIndex = entityMetadata.defaultValues.findIndex(
      (entry) => entry.propertyKey === propertyKey,
    );

    if (existingIndex !== -1) {
      // If an entry exists for the property, update it
      entityMetadata.defaultValues[existingIndex] = { propertyKey, value };
    } else {
      // Otherwise, add a new entry
      entityMetadata.defaultValues.push({ propertyKey, value });
    }

    // Store the updated metadata
    EntityMetadataStorage.setEntityMetadata(constructor, entityMetadata);
  };
};

/**
 * Function to retrieve default values metadata for a given class
 * @param target - The constructor of the entity class.
 * @returns DefaultMetadata[]
 */
export const getDefaultValuesMetadata = (target: any): DefaultMetadata[] => {
  const entityMetadata = EntityMetadataStorage.getEntityMetadata(target);
  return entityMetadata ? entityMetadata.defaultValues : [];
};
