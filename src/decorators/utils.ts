import { ClassConstructor } from '../types';
import { EntityMetadataStorage } from '../metadata/entity-metadata.storage';
import { EntityMetadata } from '../interfaces';

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
 * Helper function to get or create entity metadata for a constructor.
 * @param constructor - The constructor of the entity class.
 * @returns The entity metadata.
 */
const getOrCreateMetadata = (constructor: ClassConstructor): EntityMetadata => {
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
};

/**
 * Helper function to add metadata based on entity type.
 * @param entityMetadata - The entity metadata.
 * @param metadataType - The type of metadata being added.
 * @param metadata - The metadata to add.
 */
const addMetadata = <T>(
  entityMetadata: EntityMetadata,
  metadataType: MetadataType,
  metadata: T,
): void => {
  if (entityMetadata.entityType === 'table') {
    // Ensure tableMetadata exists and initialize the specific metadata type array if not present
    if (!entityMetadata.tableMetadata) {
      entityMetadata.tableMetadata = {
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
      };
    }
    if (!entityMetadata.tableMetadata[metadataType]) {
      (entityMetadata.tableMetadata[metadataType] as any[]) = [];
    }
    (entityMetadata.tableMetadata[metadataType] as any[]).push(metadata);
  } else if (
    entityMetadata.entityType === 'view' &&
    metadataType === 'columns'
  ) {
    // Ensure viewMetadata and columns array exist
    if (!entityMetadata.viewMetadata) {
      entityMetadata.viewMetadata = {
        viewName: '',
        schemaName: '',
        columns: [],
        underlyingQuery: '',
      };
    }
    if (!entityMetadata.viewMetadata.columns) {
      entityMetadata.viewMetadata.columns = [];
    }
    entityMetadata.viewMetadata.columns.push(metadata as any);
  }
};

/**
 * Adds metadata to the entity metadata storage with optional uniqueness check.
 * @param constructor - The constructor of the entity class.
 * @param metadataType - The type of metadata being added.
 * @param metadata - The metadata to add.
 * @param uniqueCheck - An optional function to check for uniqueness before adding.
 */
const addMetadataWithCheck = <T>(
  constructor: ClassConstructor,
  metadataType: MetadataType,
  metadata: T,
  uniqueCheck?: (existing: T, newEntry: T) => boolean,
): void => {
  const entityMetadata = getOrCreateMetadata(constructor);

  // Initialize the specific metadataType array if it doesn't exist
  if (
    entityMetadata.entityType === 'table' &&
    !entityMetadata.tableMetadata![metadataType]
  ) {
    (entityMetadata.tableMetadata![metadataType] as any[]) = [];
  }

  if (
    uniqueCheck &&
    (entityMetadata.tableMetadata![metadataType] as any[]).some((item: T) =>
      uniqueCheck(item, metadata),
    )
  ) {
    return;
  }

  addMetadata(entityMetadata, metadataType, metadata);
  EntityMetadataStorage.setEntityMetadata(constructor, entityMetadata);
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
  addMetadataWithCheck(constructor, metadataType, metadata, uniqueCheck);
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
  addMetadataWithCheck(constructor, metadataType, metadata, uniqueCheck);
};

/**
 * Retrieves specific metadata from the entity metadata storage.
 * @param target - The constructor of the entity class.
 * @param metadataType - The type of metadata to retrieve.
 * @param isClassLevel - Boolean to specify if it's class-level metadata.
 * @returns An array of the requested metadata type.
 */
const getMetadata = <T>(
  target: ClassConstructor,
  metadataType: MetadataType,
  isClassLevel: boolean,
): T[] => {
  const entityMetadata = EntityMetadataStorage.getEntityMetadata(target);
  if (!entityMetadata) return [];

  if (entityMetadata.entityType === 'table') {
    return entityMetadata.tableMetadata![metadataType] as T[];
  } else if (
    entityMetadata.entityType === 'view' &&
    metadataType === 'columns'
  ) {
    return entityMetadata.viewMetadata!.columns as unknown as T[];
  }
  return [];
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
  return getMetadata(target, metadataType, true);
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
  return getMetadata(target, metadataType, false);
};
