import { OneToOneMetadata } from '../interfaces';
import { EntityMetadataStorage, EntityMetadata } from '../metadata';
import { OneToOneOptions } from '../interfaces';

/**
 * @OneToOne decorator to define a one-to-one relationship between entities.
 * @param options - Configuration options for the relationship.
 * @returns PropertyDecorator
 */
export const OneToOne = (options: OneToOneOptions): PropertyDecorator => {
  // Validate the provided options
  if (typeof options.target !== 'function') {
    throw new Error(
      "OneToOne decorator requires a 'target' option that is a function (constructor of the target entity).",
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
    const existingRelation = entityMetadata.oneToOneRelations.find(
      (relation) => relation.propertyKey === propertyKey,
    );

    if (!existingRelation) {
      // Add new one-to-one relation metadata
      const oneToOneMetadata: OneToOneMetadata = {
        propertyKey,
        options,
      };
      entityMetadata.oneToOneRelations.push(oneToOneMetadata);

      // Store the updated one-to-one relations metadata in the EntityMetadataStorage
      EntityMetadataStorage.setEntityMetadata(constructor, entityMetadata);
    }
  };
};

/**
 * Function to retrieve one-to-one relations metadata for a given class
 * @param target - The constructor of the entity class.
 * @returns OneToOneMetadata[]
 */
export const getOneToOneMetadata = (target: any): OneToOneMetadata[] => {
  const entityMetadata = EntityMetadataStorage.getEntityMetadata(target);
  return entityMetadata ? entityMetadata.oneToOneRelations : [];
};
