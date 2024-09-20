import 'reflect-metadata';
import { EntityMetadata } from '../metadata/entity-metadata.storage';

// Define a unique metadata key to store all entities
const ENTITIES_METADATA_KEY = Symbol('entities');

// Define a type that represents a class constructor
type ClassConstructor<T = any> = new (...args: any[]) => T;

/**
 * Db2Entity decorator to mark a class as a database entity with a specified table name.
 * @param tableName - The name of the table in the database.
 * @returns ClassDecorator
 */
export function Db2Entity(tableName: string): ClassDecorator {
  if (typeof tableName !== 'string' || tableName.trim().length === 0) {
    throw new Error(
      'Db2Entity decorator requires a non-empty string as a table name.',
    );
  }

  return (target: unknown) => {
    // Ensure the target is a class constructor
    if (typeof target !== 'function' || !target.prototype) {
      throw new Error('Db2Entity decorator can only be applied to classes.');
    }

    const classConstructor = target as ClassConstructor;

    // Define metadata for the table name on the class
    Reflect.defineMetadata('tableName', tableName, classConstructor);

    // Retrieve existing entities metadata or initialize if none exists
    const existingEntities: ClassConstructor[] =
      Reflect.getMetadata(ENTITIES_METADATA_KEY, globalThis) || [];

    // Avoid duplicate registrations by checking if the target already exists
    if (!existingEntities.includes(classConstructor)) {
      existingEntities.push(classConstructor);
      Reflect.defineMetadata(
        ENTITIES_METADATA_KEY,
        existingEntities,
        globalThis,
      );
    }

    // Optionally, store additional entity metadata for other purposes
    const entityMetadata: EntityMetadata = {
      tableName,
      columns: [], // Define this as needed
      primaryKeys: [], // Define this as needed
      uniqueColumns: [], // Define this as needed
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

    Reflect.defineMetadata('entityMetadata', entityMetadata, classConstructor);
  };
}
