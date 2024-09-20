// src/metadata/entity-metadata.storage.ts

import 'reflect-metadata';

import {
  TABLE_NAME_METADATA_KEY,
  COLUMNS_METADATA_KEY,
  FOREIGN_KEYS_METADATA_KEY,
  PRIMARY_KEYS_METADATA_KEY,
  UNIQUE_COLUMNS_METADATA_KEY,
  INDEXED_COLUMNS_METADATA_KEY,
  ONE_TO_ONE_RELATIONS_METADATA_KEY,
  ONE_TO_MANY_RELATIONS_METADATA_KEY,
  MANY_TO_ONE_RELATIONS_METADATA_KEY,
  MANY_TO_MANY_RELATIONS_METADATA_KEY,
  DEFAULT_VALUES_METADATA_KEY,
  CHECK_CONSTRAINTS_METADATA_KEY,
  COMPOSITE_KEYS_METADATA_KEY,
} from '../types';
import { primeKeyOptions } from 'src/types/prime-key.types';
import {
  ManyToManyOptions,
  ManyToOneOptions,
  OneToManyOptions,
  OneToOneOptions,
  UniqueColumnMetadataOptions,
} from '../types';

export interface EntityMetadata {
  tableName: string;
  columns: ColumnMetadata[];
  primaryKeys: string[];
  uniqueColumns: string[];
  indexedColumns: string[];
  foreignKeys: ForeignKeyMetadata[];
  oneToOneRelations: RelationMetadata[];
  oneToManyRelations: RelationMetadata[];
  manyToOneRelations: RelationMetadata[];
  manyToManyRelations: RelationMetadata[];
  defaultValues: DefaultMetadata[];
  checkConstraints: CheckMetadata[];
  compositeKeys: string[];
  uniqueColumnMetadada: UniqueColumnMetadata[];
}

export interface ColumnMetadata {
  propertyKey: string | symbol;
  type?: string;
  length?: number;
  nullable?: boolean;
  default?: any;
}

export interface ColumnOptions {
  type: string;
  length?: number;
  nullable?: boolean;
  default?: any;
}

export interface ForeignKeyMetadata {
  propertyKey: string | symbol;
  foreignKeyOptions: ForeignKeyOptions;
}

export interface ForeignKeyOptions {
  reference: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
}

interface RelationMetadata {
  propertyKey: string | symbol;
  target: new (...args: any[]) => any;
  cascade?: boolean;
  joinTable?: string;
}

interface DefaultMetadata {
  propertyKey: string | symbol;
  value: any;
}

interface CheckMetadata {
  propertyKey: string | symbol;
  constraint: string;
}

export interface IndexMetadata {
  propertyKey: string | symbol;
  name: string;
}

/**
 * Interface defining the metadata structure for ManyToMany relationships.
 */
export interface ManyToManyMetadata {
  manyToManyOptions: ManyToManyOptions;
}

/**
 * Interface defining the metadata structure for ManyToOne relationships.
 */
export interface ManyToOneMetadata {
  manyToOneOptions: ManyToOneOptions;
}

/**
 * Interface defining the metadata structure for OneToMany relationships.
 */
export interface OneToManyMetadata {
  oneToManyOptions: OneToManyOptions;
}

/**
 * Interface defining the metadata structure for OneToOne relationships.
 */
export interface OneToOneMetadata {
  oneToOneOptions: OneToOneOptions;
}

/**
 * Interface defining the metadata structure for PrimaryKey columns.
 */

export interface PrimaryKeyMetadata {
  propertyKey: string | symbol;
  primeKeyOptions: primeKeyOptions;
}

/**
 * Interface defining the metadata structure for Unique columns.
 */
export interface UniqueColumnMetadata {
  propertyKey: string | symbol;
  uniqueKeyOptions: UniqueColumnMetadataOptions;
}

export class EntityMetadataStorage {
  // Unique metadata key used in the decorator
  private static ENTITIES_METADATA_KEY = Symbol('entities');

  /**
   * Retrieves all registered entity classes.
   * @returns Array of entity class constructors.
   */
  static getEntities(): (new (...args: any[]) => any)[] {
    return Reflect.getMetadata(this.ENTITIES_METADATA_KEY, globalThis) || [];
  }

  /**
   * Retrieves the metadata for a specific entity.
   * @param target - The constructor of the entity class.
   * @returns EntityMetadata
   */
  static getEntityMetadata(
    target: new (...args: any[]) => any,
  ): EntityMetadata {
    const tableName = Reflect.getMetadata(TABLE_NAME_METADATA_KEY, target);
    const columns: ColumnMetadata[] =
      Reflect.getMetadata(COLUMNS_METADATA_KEY, target) || [];
    const primaryKeys: string[] =
      Reflect.getMetadata(PRIMARY_KEYS_METADATA_KEY, target) || [];
    const uniqueColumns: string[] =
      Reflect.getMetadata(UNIQUE_COLUMNS_METADATA_KEY, target) || [];
    const indexedColumns: IndexMetadata[] =
      Reflect.getMetadata(INDEXED_COLUMNS_METADATA_KEY, target) || [];
    const foreignKeys: ForeignKeyMetadata[] =
      Reflect.getMetadata(FOREIGN_KEYS_METADATA_KEY, target) || [];
    const oneToOneRelations: RelationMetadata[] =
      Reflect.getMetadata(ONE_TO_ONE_RELATIONS_METADATA_KEY, target) || [];
    const oneToManyRelations: RelationMetadata[] =
      Reflect.getMetadata(ONE_TO_MANY_RELATIONS_METADATA_KEY, target) || [];
    const manyToOneRelations: RelationMetadata[] =
      Reflect.getMetadata(MANY_TO_ONE_RELATIONS_METADATA_KEY, target) || [];
    const manyToManyRelations: RelationMetadata[] =
      Reflect.getMetadata(MANY_TO_MANY_RELATIONS_METADATA_KEY, target) || [];
    const defaultValues: DefaultMetadata[] =
      Reflect.getMetadata(DEFAULT_VALUES_METADATA_KEY, target) || [];
    const checkConstraints: CheckMetadata[] =
      Reflect.getMetadata(CHECK_CONSTRAINTS_METADATA_KEY, target) || [];
    const compositeKeys: string[] =
      Reflect.getMetadata(COMPOSITE_KEYS_METADATA_KEY, target) || [];
    const uniqueColumnMetadada: UniqueColumnMetadata[] =
      Reflect.getMetadata(UNIQUE_COLUMNS_METADATA_KEY, target) || [];

    return {
      tableName,
      columns,
      primaryKeys,
      uniqueColumns,
      indexedColumns: indexedColumns.map(
        (index) => index.propertyKey as string,
      ),
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
}
