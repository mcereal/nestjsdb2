import { ManyToOneMetadata } from '../interfaces';
import { EntityMetadataStorage, EntityMetadata } from '../metadata';
import { ManyToOneOptions } from '../interfaces';

/**
 * @ManyToOne decorator to define a many-to-one relationship between entities.
 * @param options - Configuration options for the relationship.
 * @returns PropertyDecorator
 */
export const ManyToOne = (options: ManyToOneOptions): PropertyDecorator => {
  // Validate the provided options
  if (typeof options.target !== 'function') {
    throw new Error(
      "ManyToOne decorator requires a 'target' option that is a function (constructor of the target entity).",
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
    const existingRelation = entityMetadata.manyToOneRelations.find(
      (relation) => relation.propertyKey === propertyKey,
    );

    if (!existingRelation) {
      // Add new many-to-one relation metadata
      const manyToOneMetadata: ManyToOneMetadata = {
        propertyKey,
        options,
      };
      entityMetadata.manyToOneRelations.push(manyToOneMetadata);

      // Store the updated many-to-one relations metadata in the EntityMetadataStorage
      EntityMetadataStorage.setEntityMetadata(constructor, entityMetadata);
    }
  };
};

/**
 * Function to retrieve many-to-one relations metadata for a given class
 * @param target - The constructor of the entity class.
 * @returns ManyToOneMetadata[]
 */
export const getManyToOneMetadata = (target: any): ManyToOneMetadata[] => {
  const entityMetadata = EntityMetadataStorage.getEntityMetadata(target);
  return entityMetadata ? entityMetadata.manyToOneRelations : [];
};
