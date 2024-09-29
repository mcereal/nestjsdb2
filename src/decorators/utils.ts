// src/decorators/utils.ts

import 'reflect-metadata';
import { ClassConstructor } from '../types';
import { EntityMetadataStorage } from '../metadata/entity-metadata.storage';
import { EntityMetadata, ManyToManyMetadata } from '../interfaces';

/**
 * Define the various metadata types.
 */
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
  | 'entity';

/**
 * Retrieves existing entity metadata or creates a new one if it doesn't exist.
 * @param constructor - The constructor of the entity class.
 * @returns The entity metadata.
 */
export const getOrCreateEntityMetadata = (
  constructor: ClassConstructor,
): EntityMetadata => {
  let entityMetadata = EntityMetadataStorage.getEntityMetadata(constructor);
  if (!entityMetadata) {
    entityMetadata = {
      entityType: 'table', // Default to 'table'; can be overridden by decorators like @View
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
      viewMetadata: undefined, // Initialize as undefined; set if @View decorator is used
    };
    EntityMetadataStorage.setEntityMetadata(constructor, entityMetadata);
  }
  return entityMetadata;
};

/**
 * Adds class-level metadata to the entity metadata storage.
 * @param constructor - The constructor of the entity class.
 * @param metadataType - The type of metadata being added.
 * @param metadata - The metadata to add.
 * @param uniqueCheck - An optional function to check for uniqueness before adding.
 */
export const addClassMetadata = <T>(
  constructor: ClassConstructor,
  metadataType: MetadataType,
  metadata: T,
  uniqueCheck?: (existing: T, newEntry: T) => boolean,
): void => {
  const entityMetadata = getOrCreateEntityMetadata(constructor);

  if (uniqueCheck) {
    const exists = (entityMetadata as any)[metadataType].some((item: T) =>
      uniqueCheck(item, metadata),
    );
    if (exists) return;
  }

  // Handle based on entity type
  if (entityMetadata.entityType === 'table') {
    if (
      metadataType === 'columns' ||
      metadataType === 'primaryKeys' ||
      metadataType === 'indexedColumns' ||
      metadataType === 'foreignKeys' ||
      metadataType === 'constraints' ||
      metadataType === 'compositeKeys'
    ) {
      (entityMetadata.tableMetadata![metadataType] as any[]).push(metadata);
    }
    // Handle relations similarly
    else if (
      [
        'oneToOneRelations',
        'oneToManyRelations',
        'manyToOneRelations',
        'manyToManyRelations',
      ].includes(metadataType)
    ) {
      (entityMetadata.tableMetadata![metadataType] as any[]).push(metadata);
    }
  } else if (entityMetadata.entityType === 'view') {
    if (metadataType === 'columns') {
      entityMetadata.viewMetadata!.columns.push(metadata as any);
    }
    // Handle other metadata types for views if applicable
  }

  EntityMetadataStorage.setEntityMetadata(constructor, entityMetadata);
};

/**
 * Adds property-level metadata to the entity metadata storage.
 * @param constructor - The constructor of the entity class.
 * @param metadataType - The type of metadata being added.
 * @param metadata - The metadata to add.
 * @param uniqueCheck - An optional function to check for uniqueness before adding.
 */
export const addPropertyMetadata = <T>(
  constructor: ClassConstructor,
  metadataType: MetadataType,
  metadata: T,
  uniqueCheck?: (existing: T, newEntry: T) => boolean,
): void => {
  const entityMetadata = getOrCreateEntityMetadata(constructor);

  if (uniqueCheck) {
    const exists = (entityMetadata as any)[metadataType].some((item: T) =>
      uniqueCheck(item, metadata),
    );
    if (exists) return;
  }

  // Handle based on entity type
  if (entityMetadata.entityType === 'table') {
    if (
      metadataType === 'columns' ||
      metadataType === 'primaryKeys' ||
      metadataType === 'indexedColumns' ||
      metadataType === 'foreignKeys' ||
      metadataType === 'constraints' ||
      metadataType === 'compositeKeys'
    ) {
      (entityMetadata.tableMetadata![metadataType] as any[]).push(metadata);
    }
    // Handle relations similarly
    else if (
      [
        'oneToOneRelations',
        'oneToManyRelations',
        'manyToOneRelations',
        'manyToManyRelations',
      ].includes(metadataType)
    ) {
      (entityMetadata.tableMetadata![metadataType] as any[]).push(metadata);
    }
  } else if (entityMetadata.entityType === 'view') {
    if (metadataType === 'columns') {
      entityMetadata.viewMetadata!.columns.push(metadata as any);
    }
    // Handle other metadata types for views if applicable
  }

  EntityMetadataStorage.setEntityMetadata(constructor, entityMetadata);
};

/**
 * Retrieves specific class-level metadata from the entity metadata storage.
 * @param target - The constructor of the entity class.
 * @param metadataType - The type of metadata to retrieve.
 * @returns An array of the requested metadata type.
 */
export const getClassMetadata = <T>(
  target: ClassConstructor,
  metadataType: MetadataType,
): T[] => {
  const entityMetadata = EntityMetadataStorage.getEntityMetadata(target);
  if (!entityMetadata) return [];

  if (entityMetadata.entityType === 'table') {
    return entityMetadata.tableMetadata![metadataType] as T[];
  } else if (entityMetadata.entityType === 'view') {
    if (metadataType === 'columns') {
      return entityMetadata.viewMetadata!.columns as unknown as T[];
    }
    // Handle other metadata types for views if applicable
  }

  return [];
};

/**
 * Retrieves specific property-level metadata from the entity metadata storage.
 * @param target - The constructor of the entity class.
 * @param metadataType - The type of metadata to retrieve.
 * @returns An array of the requested metadata type.
 */
export const getPropertyMetadata = <T>(
  target: ClassConstructor,
  metadataType: MetadataType,
): T[] => {
  const entityMetadata = EntityMetadataStorage.getEntityMetadata(target);
  if (!entityMetadata) return [];

  if (entityMetadata.entityType === 'table') {
    return entityMetadata.tableMetadata![metadataType] as T[];
  } else if (entityMetadata.entityType === 'view') {
    if (metadataType === 'columns') {
      return entityMetadata.viewMetadata!.columns as unknown as T[];
    }
    // Handle other metadata types for views if applicable
  }

  return [];
};
