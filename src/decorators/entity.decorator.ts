// src/decorators/entity.decorator.ts

import { BaseClassDecorator } from './base-class.decorator';
import { EntityMetadata } from '../interfaces';
import { getClassMetadata } from './utils';
import { MetadataUtil } from '../utils';

/**
 * EntityDecorator class that extends BaseClassDecorator to handle entity metadata.
 */
class EntityDecorator extends BaseClassDecorator<EntityMetadata> {
  private metadata: EntityMetadata;
  constructor() {
    super(
      'entity', // MetadataType
      // Options Validator
      (options: EntityMetadata) => {
        if (
          !options.tableMetadata.tableName ||
          typeof options.tableMetadata.tableName !== 'string'
        ) {
          throw new Error(
            "Entity decorator requires a 'tableName' option of type string.",
          );
        }
        // Add more validations as needed
      },
      // Metadata Creator
      (options: EntityMetadata) => ({
        entityType: 'table', // or 'view' based on options
        tableMetadata: {
          tableName: options.tableMetadata.tableName,
          schemaName: options.tableMetadata.schemaName || 'public',
          columns: options.tableMetadata.columns || [],
          primaryKeys: options.tableMetadata.primaryKeys || [],
          indexedColumns: options.tableMetadata.indexedColumns || [],
          foreignKeys: options.tableMetadata.foreignKeys || [],
          oneToOneRelations: options.tableMetadata.oneToOneRelations || [],
          oneToManyRelations: options.tableMetadata.oneToManyRelations || [],
          manyToOneRelations: options.tableMetadata.manyToOneRelations || [],
          manyToManyRelations: options.tableMetadata.manyToManyRelations || [],
          defaultValues: options.tableMetadata.defaultValues || [],
          constraints: options.tableMetadata.constraints || [],
          compositeKeys: options.tableMetadata.compositeKeys || [],
        },
        viewMetadata: options.viewMetadata, // Set if @View decorator is used
      }),
      // Unique Check Function (optional)
      (existing: EntityMetadata, newEntry: EntityMetadata) =>
        existing.tableMetadata?.tableName === newEntry.tableMetadata?.tableName,
    );
  }

  // No need to implement property-specific methods
}

// Instance of EntityDecorator
const entityDecoratorInstance = new EntityDecorator();

/**
 * @Entity decorator to define an entity and its metadata.
 * @param options - Configuration options for the entity.
 * @returns ClassDecorator
 */
export const Entity = (
  options: Omit<EntityMetadata, 'entityType' | 'viewMetadata'>,
): ClassDecorator => {
  return entityDecoratorInstance.decorate({
    ...options,
    entityType: 'table' || 'view',
  });
};

/**
 * Retrieves entity metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns EntityMetadata[]
 */
export const getEntityMetadata = (target: any): EntityMetadata[] => {
  return getClassMetadata(target, 'entity') as EntityMetadata[];
};
