// src/decorators/utils.ts

import { EntityMetadataStorage, EntityMetadata } from '../metadata';
import { ClassConstructor } from '../types';

export type MetadataType =
  | 'columns'
  | 'manyToManyRelations'
  | 'oneToOneRelations'
  | 'defaultValues'
  | 'oneToManyRelations'
  | 'manyToOneRelations'
  | 'uniqueColumns'
  | 'indexedColumns'
  | 'foreignKeys'
  | 'checkConstraints'
  | 'compositeKeys'
  | 'uniqueColumnMetadada'
  | 'primaryKeys';
// Add other metadata types as needed

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
    EntityMetadataStorage.setEntityMetadata(constructor, entityMetadata);
  }
  return entityMetadata;
};

/**
 * Adds metadata to the entity metadata storage.
 * @param constructor - The constructor of the entity class.
 * @param metadataType - The type of metadata being added.
 * @param metadata - The metadata to add.
 * @param uniqueCheck - An optional function to check for uniqueness before adding.
 */
export const addMetadata = <T>(
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

  (entityMetadata as any)[metadataType].push(metadata);
  EntityMetadataStorage.setEntityMetadata(constructor, entityMetadata);
};

/**
 * Retrieves specific metadata from the entity metadata storage.
 * @param target - The constructor of the entity class.
 * @param metadataType - The type of metadata to retrieve.
 * @returns An array of the requested metadata type.
 */
export const getMetadata = <T>(
  target: any,
  metadataType: MetadataType,
): T[] => {
  const entityMetadata = EntityMetadataStorage.getEntityMetadata(target);
  return entityMetadata && entityMetadata[metadataType]
    ? (entityMetadata[metadataType] as T[])
    : [];
};
