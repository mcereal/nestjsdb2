// src/decorators/entity.decorator.ts

import { MetadataManager, MetadataType } from '../metadata/metadata-manager';
import { EntityMetadata } from '../interfaces';
import { ClassConstructor } from '../types';

/**
 * EntityDecorator class to handle entity metadata using MetadataManager.
 */
class EntityDecorator {
  private metadataType: MetadataType = 'entity';
  private metadataManager: MetadataManager;

  constructor() {
    this.metadataManager = new MetadataManager(); // Instantiate MetadataManager
  }

  /**
   * Validation function for entity options.
   * @param options - The options to validate.
   */
  private validateOptions(options: EntityMetadata): void {
    if (!options.name || typeof options.name !== 'string') {
      throw new Error(
        "Entity decorator requires a 'name' property of type string.",
      );
    }

    if (options.entityType === 'table') {
      if (options.tableMetadata && typeof options.tableMetadata !== 'object') {
        throw new Error("'tableMetadata' must be an object if provided.");
      }
    } else if (options.entityType === 'view') {
      if (options.viewMetadata && typeof options.viewMetadata !== 'object') {
        throw new Error("'viewMetadata' must be an object if provided.");
      }
    } else {
      throw new Error(
        "Entity decorator requires a valid 'entityType' of 'table' or 'view'.",
      );
    }
  }

  /**
   * Metadata creation function.
   * @param options - The options for creating the metadata.
   * @returns EntityMetadata
   */
  private createMetadata(options: EntityMetadata): EntityMetadata {
    if (options.entityType === 'table') {
      return {
        entityType: 'table',
        name: options.name,
        tableMetadata: {
          tableName: options.name,
          schemaName: options.tableMetadata?.schemaName || 'public',
          columns: options.tableMetadata?.columns || [],
          primaryKeys: options.tableMetadata?.primaryKeys || [],
          indexedColumns: options.tableMetadata?.indexedColumns || [],
          foreignKeys: options.tableMetadata?.foreignKeys || [],
          oneToOneRelations: options.tableMetadata?.oneToOneRelations || [],
          oneToManyRelations: options.tableMetadata?.oneToManyRelations || [],
          manyToOneRelations: options.tableMetadata?.manyToOneRelations || [],
          manyToManyRelations: options.tableMetadata?.manyToManyRelations || [],
          defaultValues: options.tableMetadata?.defaultValues || [],
          constraints: options.tableMetadata?.constraints || [],
          compositeKeys: options.tableMetadata?.compositeKeys || [],
        },
      };
    } else if (options.entityType === 'view') {
      return {
        entityType: 'view',
        name: options.name,
        viewMetadata: {
          viewName: options.name,
          schemaName: options.viewMetadata?.schemaName || 'public',
          columns: options.viewMetadata?.columns || [],
          underlyingQuery: options.viewMetadata?.underlyingQuery || '',
        },
      };
    }

    // Return a default entity metadata if no valid entityType is provided
    return {
      entityType: 'table',
      name: options.name,
      tableMetadata: {
        tableName: options.name,
        schemaName: 'public',
        columns: [],
        primaryKeys: [],
        indexedColumns: [],
        foreignKeys: [],
        oneToOneRelations: [],
        oneToManyRelations: [],
        manyToOneRelations: [],
        manyToManyRelations: [],
        defaultValues: [],
        constraints: [],
        compositeKeys: [],
      },
    };
  }

  /**
   * Unique check function to avoid duplicate metadata entries.
   * @param existing - The existing metadata.
   * @param newEntry - The new metadata to add.
   * @returns boolean - Whether the metadata is unique.
   */
  private isUnique(
    existing: EntityMetadata,
    newEntry: EntityMetadata,
  ): boolean {
    if (newEntry.entityType === 'table') {
      return (
        existing.tableMetadata?.tableName === newEntry.tableMetadata?.tableName
      );
    } else if (newEntry.entityType === 'view') {
      return (
        existing.viewMetadata?.viewName === newEntry.viewMetadata?.viewName
      );
    }
    return false;
  }

  /**
   * Decorator method to add entity metadata to the class.
   * @param options - Configuration options for the entity.
   * @returns ClassDecorator
   */
  public decorate(options: EntityMetadata): ClassDecorator {
    return (target: Function) => {
      this.validateOptions(options);
      const metadata = this.createMetadata(options);
      this.metadataManager.addMetadata(
        target as ClassConstructor,
        this.metadataType,
        metadata,
        this.isUnique,
      );
    };
  }
}

// Instance of EntityDecorator
const entityDecoratorInstance = new EntityDecorator();

/**
 * @Entity decorator to define an entity and its metadata.
 * @param options - Configuration options for the entity.
 * @returns ClassDecorator
 */
export const Entity = (options: EntityMetadata): ClassDecorator => {
  return entityDecoratorInstance.decorate(options);
};

/**
 * Retrieves entity metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns EntityMetadata[]
 */
export const getEntityMetadata = (target: any): EntityMetadata[] => {
  const metadataManager = new MetadataManager(); // Create an instance of MetadataManager
  return metadataManager.getMetadata(
    target.constructor,
    'entity',
  ) as EntityMetadata[];
};
