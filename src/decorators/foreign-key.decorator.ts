import { ForeignKeyMetadata, ForeignKeyOptions } from '../interfaces';
import { EntityMetadataStorage, EntityMetadata } from '../metadata';

/**
 * @ForeignKey decorator to define a foreign key relationship.
 * @param options - Configuration options for the foreign key.
 * @returns PropertyDecorator
 */
export const ForeignKey = (options: ForeignKeyOptions): PropertyDecorator => {
  // Validate options
  if (
    typeof options.reference !== 'string' ||
    !options.reference.includes('(') ||
    !options.reference.includes(')')
  ) {
    throw new Error(
      "ForeignKey decorator requires a 'reference' string in the format 'referenced_table(referenced_column)'.",
    );
  }

  if (
    options.onDelete &&
    !['CASCADE', 'SET NULL', 'RESTRICT'].includes(options.onDelete)
  ) {
    throw new Error(
      "ForeignKey decorator 'onDelete' option must be 'CASCADE', 'SET NULL', or 'RESTRICT'.",
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

    // Add new foreign key metadata
    const foreignKeyMetadata: ForeignKeyMetadata = {
      propertyKey,
      options,
    };

    entityMetadata.foreignKeys.push(foreignKeyMetadata);

    // Store the updated metadata in the EntityMetadataStorage
    EntityMetadataStorage.setEntityMetadata(constructor, entityMetadata);
  };
};

/**
 * Function to retrieve foreign key metadata for a given class
 * @param target - The constructor of the entity class.
 * @returns ForeignKeyMetadata[]
 */
export const getForeignKeyMetadata = (target: any): ForeignKeyMetadata[] => {
  const entityMetadata = EntityMetadataStorage.getEntityMetadata(target);
  return entityMetadata ? entityMetadata.foreignKeys : [];
};
