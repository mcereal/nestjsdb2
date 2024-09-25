// src/metadata/entity-metadata.storage.ts

import {
  ManyToManyMetadata,
  ManyToOneMetadata,
  OneToManyMetadata,
  OneToOneMetadata,
  UniqueColumnMetadata,
  CheckConstraintMetadata,
  DefaultMetadata,
  ForeignKeyMetadata,
  PrimaryKeyMetadata,
  IndexedColumnMetadata,
  ColumnMetadata,
  CompositeKeyMetadata,
} from '../interfaces';

export interface EntityMetadata {
  tableName: string;
  columns: ColumnMetadata[];
  primaryKeys: PrimaryKeyMetadata[];
  uniqueColumns: UniqueColumnMetadata[];
  indexedColumns: IndexedColumnMetadata[];
  foreignKeys: ForeignKeyMetadata[];
  oneToOneRelations: OneToOneMetadata[];
  oneToManyRelations: OneToManyMetadata[];
  manyToOneRelations: ManyToOneMetadata[];
  manyToManyRelations: ManyToManyMetadata[];
  defaultValues: DefaultMetadata[];
  checkConstraints: CheckConstraintMetadata[];
  compositeKeys: CompositeKeyMetadata[];
  uniqueColumnMetadada: UniqueColumnMetadata[];
}

// WeakMaps to store different types of metadata
const tableNameStore = new WeakMap<any, string>();
const columnsStore = new WeakMap<any, ColumnMetadata[]>();
const primaryKeysStore = new WeakMap<any, PrimaryKeyMetadata[]>();
const uniqueColumnsStore = new WeakMap<any, UniqueColumnMetadata[]>();
const indexedColumnsStore = new WeakMap<any, IndexedColumnMetadata[]>();
const foreignKeysStore = new WeakMap<any, ForeignKeyMetadata[]>();
const oneToOneRelationsStore = new WeakMap<any, OneToOneMetadata[]>();
const oneToManyRelationsStore = new WeakMap<any, OneToManyMetadata[]>();
const manyToOneRelationsStore = new WeakMap<any, ManyToOneMetadata[]>();
const manyToManyRelationsStore = new WeakMap<any, ManyToManyMetadata[]>();
const defaultValuesStore = new WeakMap<any, DefaultMetadata[]>();
const checkConstraintsStore = new WeakMap<any, CheckConstraintMetadata[]>();
const compositeKeysStore = new WeakMap<any, CompositeKeyMetadata[]>();
const uniqueColumnMetadataStore = new WeakMap<any, UniqueColumnMetadata[]>();
const entitiesStore = new Set<any>();

export class EntityMetadataStorage {
  /**
   * Retrieves all registered entity classes.
   * @returns Array of entity class constructors.
   */
  static getEntities(): (new (...args: any[]) => any)[] {
    return Array.from(entitiesStore);
  }

  /**
   * Retrieves the metadata for a specific entity.
   * @param target - The constructor of the entity class.
   * @returns EntityMetadata
   */
  static getEntityMetadata(
    target: new (...args: any[]) => any,
  ): EntityMetadata {
    const tableName = tableNameStore.get(target) || '';
    const columns = columnsStore.get(target) || [];
    const primaryKeys = primaryKeysStore.get(target) || [];
    const uniqueColumns = uniqueColumnsStore.get(target) || [];
    const indexedColumns = indexedColumnsStore.get(target) || [];
    const foreignKeys = foreignKeysStore.get(target) || [];
    const oneToOneRelations = oneToOneRelationsStore.get(target) || [];
    const oneToManyRelations = oneToManyRelationsStore.get(target) || [];
    const manyToOneRelations = manyToOneRelationsStore.get(target) || [];
    const manyToManyRelations = manyToManyRelationsStore.get(target) || [];
    const defaultValues = defaultValuesStore.get(target) || [];
    const checkConstraints = checkConstraintsStore.get(target) || [];
    const compositeKeys = compositeKeysStore.get(target) || [];
    const uniqueColumnMetadada = uniqueColumnMetadataStore.get(target) || [];

    return {
      tableName,
      columns,
      primaryKeys,
      uniqueColumns,
      indexedColumns,
      foreignKeys,
      oneToOneRelations,
      oneToManyRelations,
      manyToOneRelations,
      manyToManyRelations,
      defaultValues,
      checkConstraints,
      compositeKeys,
      uniqueColumnMetadada,
    };
  }

  /**
   * Stores metadata for an entity.
   * @param target - The constructor of the entity class.
   * @param metadata - The entity metadata to store.
   */
  static setEntityMetadata(
    target: new (...args: any[]) => any,
    metadata: EntityMetadata,
  ) {
    tableNameStore.set(target, metadata.tableName);
    columnsStore.set(target, metadata.columns);
    primaryKeysStore.set(target, metadata.primaryKeys);
    uniqueColumnsStore.set(target, metadata.uniqueColumns);
    indexedColumnsStore.set(target, metadata.indexedColumns);
    foreignKeysStore.set(target, metadata.foreignKeys);
    oneToOneRelationsStore.set(target, metadata.oneToOneRelations);
    oneToManyRelationsStore.set(target, metadata.oneToManyRelations);
    manyToOneRelationsStore.set(target, metadata.manyToOneRelations);
    manyToManyRelationsStore.set(target, metadata.manyToManyRelations);
    defaultValuesStore.set(target, metadata.defaultValues);
    checkConstraintsStore.set(target, metadata.checkConstraints);
    compositeKeysStore.set(target, metadata.compositeKeys);
    uniqueColumnMetadataStore.set(target, metadata.uniqueColumnMetadada);
    entitiesStore.add(target);
  }
}
