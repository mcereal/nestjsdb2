import { OneToManyMetadata } from '../interfaces';
import { EntityMetadataStorage, EntityMetadata } from '../metadata';
import { OneToManyOptions } from '../interfaces';

/**
 * @OneToMany decorator to define a one-to-many relationship between entities.
 * @param options - Configuration options for the relationship.
 * @returns PropertyDecorator
 */
export const OneToMany = (options: OneToManyOptions): PropertyDecorator => {
  // Validate the provided options
  if (typeof options.target !== 'function') {
    throw new Error(
      "OneToMany decorator requires a 'target' option that is a function (constructor of the target entity).",
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

    // Check if the relation already exists to avoid duplicates
    const existingRelation = entityMetadata.oneToManyRelations.find(
      (relation) => relation.propertyKey === propertyKey,
    );

    if (!existingRelation) {
      // Add new one-to-many relation metadata
      const oneToManyMetadata: OneToManyMetadata = {
        propertyKey,
        options,
      };
      entityMetadata.oneToManyRelations.push(oneToManyMetadata);

      // Store the updated one-to-many relations metadata in the EntityMetadataStorage
      EntityMetadataStorage.setEntityMetadata(constructor, entityMetadata);
    }
  };
};

/**
 * Function to retrieve one-to-many relations metadata for a given class
 * @param target - The constructor of the entity class.
 * @returns OneToManyMetadata[]
 */
export const getOneToManyMetadata = (target: any): OneToManyMetadata[] => {
  const entityMetadata = EntityMetadataStorage.getEntityMetadata(target);
  return entityMetadata ? entityMetadata.oneToManyRelations : [];
};
