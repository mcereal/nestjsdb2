import { EntityMetadataStorage, EntityMetadata } from '../metadata';
import { ClassConstructor } from '../types';

/**
 * Db2Entity decorator to mark a class as a database entity with a specified table name.
 * @param tableName - The name of the table in the database.
 * @returns ClassDecorator
 */
export const Db2Entity = (tableName: string): ClassDecorator => {
  if (typeof tableName !== 'string' || tableName.trim().length === 0) {
    throw new Error(
      'Db2Entity decorator requires a non-empty string as a table name.',
    );
  }

  return (target: Function) => {
    // Ensure the target is a class constructor
    if (typeof target !== 'function' || !target.prototype) {
      throw new Error('Db2Entity decorator can only be applied to classes.');
    }

    const classConstructor = target as ClassConstructor;

    // Check if the class constructor is already registered
    if (!EntityMetadataStorage.getEntities().includes(classConstructor)) {
      EntityMetadataStorage.getEntities().push(classConstructor);
    }

    // Define and store entity metadata for the class
    const entityMetadata: EntityMetadata = {
      tableName,
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

    // Store the metadata in the EntityMetadataStorage
    EntityMetadataStorage.setEntityMetadata(classConstructor, entityMetadata);
  };
};

/**
 * Function to retrieve entity metadata for a given class
 * @param target - The constructor of the entity class.
 * @returns EntityMetadata | undefined
 */
export const getEntityMetadata = (
  target: ClassConstructor,
): EntityMetadata | undefined => {
  return EntityMetadataStorage.getEntityMetadata(target);
};

/**
 * Function to retrieve all registered entities
 * @returns Array of ClassConstructors
 */
export const getRegisteredEntities = (): ClassConstructor[] => {
  return EntityMetadataStorage.getEntities();
};
