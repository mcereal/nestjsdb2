// src/decorators/entity.decorator.ts

import { BaseClassDecorator } from './base-class.decorator';
import {
  EntityMetadata,
  EntityType,
  TableMetadata,
  ViewMetadata,
} from '../interfaces';
import { getClassMetadata } from './utils';

interface EntityOptions {
  entityType: EntityType;
  tableMetadata?: TableMetadata;
  viewMetadata?: ViewMetadata;
}

/**
 * EntityDecorator class that extends BaseClassDecorator to handle entity metadata.
 */
class EntityDecorator extends BaseClassDecorator<EntityOptions> {
  constructor() {
    super(
      'entity', // MetadataType
      // Options Validator
      (options: EntityOptions) => {
        if (options.entityType === 'table') {
          if (
            !options.tableMetadata ||
            typeof options.tableMetadata.tableName !== 'string'
          ) {
            throw new Error(
              "Entity decorator requires a 'tableName' option of type string for tables.",
            );
          }
        } else if (options.entityType === 'view') {
          if (
            !options.viewMetadata ||
            typeof options.viewMetadata.viewName !== 'string'
          ) {
            throw new Error(
              "Entity decorator requires a 'viewName' option of type string for views.",
            );
          }
        } else {
          throw new Error(
            "Entity decorator requires a valid 'entityType' of 'table' or 'view'.",
          );
        }
      },
      // Metadata Creator
      (options: EntityOptions) => {
        if (options.entityType === 'table') {
          return {
            entityType: 'table',
            tableMetadata: {
              tableName: options.tableMetadata?.tableName || '',
              schemaName: options.tableMetadata?.schemaName || 'public',
              columns: options.tableMetadata?.columns || [],
              primaryKeys: options.tableMetadata?.primaryKeys || [],
              indexedColumns: options.tableMetadata?.indexedColumns || [],
              foreignKeys: options.tableMetadata?.foreignKeys || [],
              oneToOneRelations: options.tableMetadata?.oneToOneRelations || [],
              oneToManyRelations:
                options.tableMetadata?.oneToManyRelations || [],
              manyToOneRelations:
                options.tableMetadata?.manyToOneRelations || [],
              manyToManyRelations:
                options.tableMetadata?.manyToManyRelations || [],
              defaultValues: options.tableMetadata?.defaultValues || [],
              constraints: options.tableMetadata?.constraints || [],
              compositeKeys: options.tableMetadata?.compositeKeys || [],
            },
          };
        } else if (options.entityType === 'view') {
          return {
            entityType: 'view',
            viewMetadata: {
              viewName: options.viewMetadata?.viewName || '',
              schemaName: options.viewMetadata?.schemaName || 'public',
              columns: options.viewMetadata?.columns || [],
              underlyingQuery: options.viewMetadata?.underlyingQuery || '',
            },
          };
        }
        return {};
      },
      // Unique Check Function (optional)
      (existing: EntityMetadata, newEntry: EntityMetadata) => {
        if (newEntry.entityType === 'table') {
          return (
            existing.tableMetadata?.tableName ===
            newEntry.tableMetadata?.tableName
          );
        } else if (newEntry.entityType === 'view') {
          return (
            existing.viewMetadata?.viewName === newEntry.viewMetadata?.viewName
          );
        }
        return false;
      },
    );
  }
}

// Instance of EntityDecorator
const entityDecoratorInstance = new EntityDecorator();

/**
 * @Entity decorator to define an entity and its metadata.
 * @param options - Configuration options for the entity.
 * @returns ClassDecorator
 */
export const Entity = (options: EntityOptions): ClassDecorator => {
  return entityDecoratorInstance.decorate(options);
};

/**
 * Retrieves entity metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns EntityMetadata[]
 */
export const getEntityMetadata = (target: any): EntityMetadata[] => {
  return getClassMetadata(target, 'entity') as EntityMetadata[];
};
