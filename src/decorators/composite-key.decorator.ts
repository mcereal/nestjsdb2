import { CompositeKeyMetadata } from '../interfaces';
import { EntityMetadataStorage, EntityMetadata } from '../metadata';

/**
 * Class decorator to mark a composite key in an entity.
 * @param keys - An array of strings representing the properties that form the composite key.
 * @returns A class decorator.
 */
export const CompositeKey = (keys: string[]): ClassDecorator => {
  if (!Array.isArray(keys) || keys.length === 0) {
    throw new Error(
      'CompositeKey must be initialized with a non-empty array of strings.',
    );
  }

  return (target: Function) => {
    // Using Function type as expected by ClassDecorator
    if (typeof target !== 'function') {
      throw new Error('CompositeKey decorator can only be applied to classes.');
    }

    // Ensure that the constructor is treated as a class constructor
    const constructor = target as new (...args: any[]) => any;

    // Get the prototype of the target to access defined properties
    const prototype = target.prototype;

    // Get existing properties defined in the class prototype
    const existingProperties = Object.getOwnPropertyNames(prototype);

    // Check if all provided keys are valid properties of the class
    const invalidKeys = keys.filter((key) => !existingProperties.includes(key));
    if (invalidKeys.length > 0) {
      throw new Error(
        `Invalid composite key properties: ${invalidKeys.join(
          ', ',
        )}. Make sure all keys are valid class properties.`,
      );
    }

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

    // Add new composite key metadata
    const compositeKeyMetadata: CompositeKeyMetadata = { keys };
    entityMetadata.compositeKeys.push(compositeKeyMetadata);

    // Store the updated metadata
    EntityMetadataStorage.setEntityMetadata(constructor, entityMetadata);
  };
};

/**
 * Function to retrieve composite key metadata for a given class
 * @param target - The constructor of the entity class.
 * @returns CompositeKeyMetadata[]
 */
export const getCompositeKeyMetadata = (
  target: Function, // Using Function type here as well
): CompositeKeyMetadata[] => {
  const constructor = target as new (...args: any[]) => any;
  const entityMetadata = EntityMetadataStorage.getEntityMetadata(constructor);
  return entityMetadata ? entityMetadata.compositeKeys : [];
};
