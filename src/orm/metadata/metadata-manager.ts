// metadata/metadata-manager.ts

import { ClassConstructor } from '../types';
import { EntityMetadataStorage } from '../metadata/entity-metadata.storage';
import { EntityMetadata } from '../interfaces';
import { Logger } from '../../utils/logger';

export type MetadataType =
  | 'columns'
  | 'manyToManyRelations'
  | 'oneToOneRelations'
  | 'defaultValues'
  | 'oneToManyRelations'
  | 'manyToOneRelations'
  | 'indexedColumns'
  | 'foreignKeys'
  | 'constraints'
  | 'compositeKeys'
  | 'primaryKeys'
  | 'uniqueColumns'
  | 'entity'
  | 'view'
  | 'table';

export class MetadataManager {
  /**
   * Retrieves or creates metadata for a given constructor.
   * @param constructor - The constructor of the entity class.
   * @returns The entity metadata.
   */
  private static instance: MetadataManager;
  private readonly logger = new Logger(MetadataManager.name);

  private getOrCreateMetadata(constructor: ClassConstructor): EntityMetadata {
    let entityMetadata = EntityMetadataStorage.getEntityMetadata(constructor);
    if (!entityMetadata) {
      entityMetadata = {
        entityType: 'table',
        name: constructor.name,
        tableMetadata: {
          tableName: '',
          schemaName: '',
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
        viewMetadata: undefined,
      };
      EntityMetadataStorage.setEntityMetadata(constructor, entityMetadata);
    }
    return entityMetadata;
  }

  /**
   * Adds metadata of a specific type to an entity.
   * @param constructor - The constructor of the entity class.
   * @param metadataType - The type of metadata being added.
   * @param metadata - The metadata to add.
   * @param uniqueCheck - An optional function to check for uniqueness before adding.
   */
  public addMetadata<T>(
    constructor: ClassConstructor,
    metadataType: MetadataType,
    metadata: T,
    uniqueCheck?: (existing: T, newEntry: T) => boolean,
  ): void {
    const entityMetadata = this.getOrCreateMetadata(constructor);

    if (entityMetadata.entityType === 'table') {
      if (!entityMetadata.tableMetadata[metadataType]) {
        (entityMetadata.tableMetadata[metadataType] as T[]) = [];
      }

      if (
        uniqueCheck &&
        (entityMetadata.tableMetadata[metadataType] as T[]).some((item) =>
          uniqueCheck(item, metadata),
        )
      ) {
        return;
      }

      (entityMetadata.tableMetadata[metadataType] as T[]).push(metadata);
    } else if (
      entityMetadata.entityType === 'view' &&
      metadataType === 'columns'
    ) {
      if (!entityMetadata.viewMetadata) {
        entityMetadata.viewMetadata = {
          viewName: '',
          schemaName: '',
          columns: [],
          underlyingQuery: '',
        };
      }
      entityMetadata.viewMetadata.columns.push(metadata as any);
    }

    EntityMetadataStorage.setEntityMetadata(constructor, entityMetadata);
  }

  public removeMetadata<T>(
    constructor: ClassConstructor,
    metadataType: MetadataType,
    predicate: (metadata: T) => boolean,
  ): void {
    this.logger.info(
      `Removing metadata for ${constructor.name} - Type: ${metadataType}`,
    );

    const entityMetadata = this.getOrCreateMetadata(constructor);

    if (entityMetadata.entityType === 'table') {
      const metadataArray = entityMetadata.tableMetadata[metadataType] as T[];
      const index = metadataArray.findIndex(predicate);
      if (index !== -1) {
        metadataArray.splice(index, 1);
        this.logger.info(`Removed metadata at index ${index}`);
      } else {
        this.logger.info('No matching metadata found to remove.');
      }
    } else if (
      entityMetadata.entityType === 'view' &&
      metadataType === 'columns'
    ) {
      const metadataArray = entityMetadata.viewMetadata?.columns as T[];
      const index = metadataArray.findIndex(predicate);
      if (index !== -1) {
        metadataArray.splice(index, 1);
        this.logger.info(`Removed metadata at index ${index}`);
      } else {
        this.logger.info('No matching metadata found to remove.');
      }

      EntityMetadataStorage.setEntityMetadata(constructor, entityMetadata);
    }
  }

  /**
   * Retrieves metadata for a specific entity.
   * @param constructor - The constructor of the entity class.
   * @returns EntityMetadata
   */
  public getEntityMetadata(constructor: ClassConstructor): EntityMetadata {
    const metadata = EntityMetadataStorage.getEntityMetadata(constructor);
    if (!metadata) {
      throw new Error(`No metadata found for entity: ${constructor.name}`);
    }
    return metadata;
  }

  /**
   * Retrieves metadata of a specific type for an entity.
   * @param constructor - The constructor of the entity class.
   * @param metadataType - The type of metadata to retrieve.
   * @returns An array of metadata of the specified type.
   */
  public getMetadata<T>(
    constructor: ClassConstructor,
    metadataType: MetadataType,
  ): T[] {
    const entityMetadata = this.getEntityMetadata(constructor);

    if (entityMetadata.entityType === 'table') {
      return (entityMetadata.tableMetadata[metadataType] as T[]) || [];
    } else if (
      entityMetadata.entityType === 'view' &&
      metadataType === 'columns'
    ) {
      return (entityMetadata.viewMetadata?.columns as unknown as T[]) || [];
    }
    return [];
  }

  /**
   * getPropertyMetadata - Retrieves metadata for a specific property of an entity.
   * @param constructor - The constructor of the entity class.
   * @param propertyKey - The property key of the metadata.
   * @returns The metadata for the specified property.
   * @throws Will throw an error if the property metadata is not found.
   * @example
   * ```ts
   * const metadata = metadataManager.getPropertyMetadata(User, 'email');
   * ```
   */
  public getPropertyMetadata<T>(
    constructor: ClassConstructor,
    propertyKey: string,
  ): T {
    const entityMetadata = this.getEntityMetadata(constructor);
    const columnMetadata = entityMetadata.tableMetadata.columns.find(
      (column) => column.propertyKey === propertyKey,
    );
    if (!columnMetadata) {
      throw new Error(
        `No metadata found for property '${propertyKey}' of entity: ${constructor.name}`,
      );
    }
    return columnMetadata as unknown as T;
  }

  /**
   * getPropertyMetadata - Retrieves metadata for a specific property of an entity.
   * @param constructor - The constructor of the entity class.
   * @param propertyKey - The property key of the metadata.
   * @returns The metadata for the specified property, or `undefined` if not found.
   * @example
   * ```ts
   * const metadata = metadataManager.getPropertyMetadata(User, 'email');
   * ```
   */
  public getPropertyMetadataIfExists<T>(
    constructor: ClassConstructor,
    propertyKey: string,
  ): T | undefined {
    const entityMetadata = this.getEntityMetadata(constructor);
    return entityMetadata.tableMetadata.columns.find(
      (column) => column.propertyKey === propertyKey,
    ) as unknown as T;
  }

  /**
   * Retrieves the primary key metadata for an entity.
   * @param constructor - The constructor of the entity class.
   * @returns The primary key metadata.
   */
  public static getInstance(): MetadataManager {
    if (!MetadataManager.instance) {
      MetadataManager.instance = new MetadataManager();
    }
    return MetadataManager.instance;
  }

  /**
   * Retrieves all registered entity classes.
   * @returns Array of entity class constructors.
   */
  public getAllEntities(): ClassConstructor[] {
    return EntityMetadataStorage.getEntities();
  }
}
