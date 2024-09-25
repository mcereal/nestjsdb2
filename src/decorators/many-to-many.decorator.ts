import { ManyToManyMetadata } from '../interfaces';
import { EntityMetadataStorage, EntityMetadata } from '../metadata';
import { ManyToManyOptions } from '../interfaces';

/**
 * @ManyToMany decorator to define a many-to-many relationship between entities.
 * @param options - Configuration options for the relationship.
 * @returns PropertyDecorator
 */
export const ManyToMany = (options: ManyToManyOptions): PropertyDecorator => {
  // Validate the provided options
  if (typeof options.target !== 'function') {
    throw new Error(
      "ManyToMany decorator requires a 'target' option that is a function (constructor of the target entity).",
    );
  }

  if (options.joinTable && typeof options.joinTable !== 'string') {
    throw new Error(
      "ManyToMany decorator 'joinTable' option must be a string if provided.",
    );
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

    // Check for existing relation for the same property key to avoid duplicates
    const isAlreadyRelated = entityMetadata.manyToManyRelations.some(
      (relation) => relation.propertyKey === propertyKey,
    );

    if (!isAlreadyRelated) {
      // Add new many-to-many relation metadata
      const manyToManyMetadata: ManyToManyMetadata = {
        propertyKey,
        options,
      };
      entityMetadata.manyToManyRelations.push(manyToManyMetadata);

      // Store the updated many-to-many relations metadata in the EntityMetadataStorage
      EntityMetadataStorage.setEntityMetadata(constructor, entityMetadata);
    }
  };
};

/**
 * Function to retrieve many-to-many relations metadata for a given class
 * @param target - The constructor of the entity class.
 * @returns ManyToManyMetadata[]
 */
export const getManyToManyMetadata = (target: any): ManyToManyMetadata[] => {
  const entityMetadata = EntityMetadataStorage.getEntityMetadata(target);
  return entityMetadata ? entityMetadata.manyToManyRelations : [];
};
