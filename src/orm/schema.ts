// src/orm/schema.ts

import { MetadataUtil } from '../utils/metadata.utils';
import {
  EntityMetadata,
  ColumnMetadata,
  RelationMetadata,
  ForeignKeyMetadata,
  IndexedColumnMetadata,
  PrimaryKeyMetadata,
} from '../interfaces';
import { ClassConstructor } from '../types';
import { ColumnsHandler } from './schema-handlers/columns.handler';
import { RelationsHandler } from './schema-handlers/relations.handler';
import { ConstraintsHandler } from './schema-handlers/constraints.handler';
import { IndexesHandler } from './schema-handlers/indexes.handler';
import { ForeignKeysHandler } from './schema-handlers/foreign-keys.handler';
import { DefaultValuesHandler } from './schema-handlers/default-values.handler';
import { CompositeKeysHandler } from './schema-handlers/composite-keys.handler';
import { PrimaryKeysHandler } from './schema-handlers/primary-keys.handler';

/**
 * Represents the schema definition for multiple entities.
 * Handles table/view metadata, columns, relations, constraints, etc.
 */
export class Schema<T extends ClassConstructor<any>[]> {
  private metadataMap: Map<ClassConstructor<any>, EntityMetadata> = new Map();
  private currentEntity?: ClassConstructor<any>;

  private columnsHandler: ColumnsHandler;
  private relationsHandler: RelationsHandler;
  private constraintsHandler: ConstraintsHandler;
  private indexesHandler: IndexesHandler;
  private foreignKeysHandler: ForeignKeysHandler;
  private defaultValuesHandler: DefaultValuesHandler;
  private compositeKeysHandler: CompositeKeysHandler;
  private primaryKeysHandler: PrimaryKeysHandler;

  constructor(private entities: T) {
    this.entities.forEach((entity) => {
      const metadata = MetadataUtil.getEntityMetadata(entity);
      if (!metadata) {
        throw new Error(`No metadata found for entity: ${entity.name}`);
      }
      this.metadataMap.set(entity, metadata);
    });

    // Initialize handlers with an empty entity initially
    this.columnsHandler = new ColumnsHandler(this);
    this.relationsHandler = new RelationsHandler(this);
    this.constraintsHandler = new ConstraintsHandler(this);
    this.indexesHandler = new IndexesHandler(this);
    this.foreignKeysHandler = new ForeignKeysHandler(this);
    this.defaultValuesHandler = new DefaultValuesHandler(this);
    this.compositeKeysHandler = new CompositeKeysHandler(this);
    this.primaryKeysHandler = new PrimaryKeysHandler(this);
  }

  /**
   * Get the metadata for a specific entity.
   * @param entity - The class constructor of the entity.
   */
  public getMetadata<U>(entity: ClassConstructor<U>): EntityMetadata {
    const metadata = this.metadataMap.get(entity);
    if (!metadata) {
      throw new Error(`No metadata found for entity: ${entity.name}`);
    }
    return metadata;
  }

  /**
   * Get the metadata for the currently set entity.
   */
  getCurrentMetadata(): EntityMetadata {
    if (!this.currentEntity) {
      throw new Error('No entity is currently set in the schema.');
    }
    return this.metadataMap.get(this.currentEntity)!;
  }

  /**
   * Set the current entity context.
   * @param entity - The class constructor of the entity.
   */
  setEntity(entity: ClassConstructor<any>): void {
    if (!this.metadataMap.has(entity)) {
      throw new Error(`Entity '${entity.name}' is not part of this schema.`);
    }
    this.currentEntity = entity;
  }

  /**
   * Checks if the entity is a table.
   * @param entity - The entity class constructor.
   */
  isTable<U>(entity: ClassConstructor<U>): boolean {
    const metadata = this.getMetadata(entity);
    return metadata.entityType === 'table' && !!metadata.tableMetadata;
  }

  /**
   * Checks if the entity is a view.
   * @param entity - The entity class constructor.
   */
  isView<U>(entity: ClassConstructor<U>): boolean {
    const metadata = this.getMetadata(entity);
    return metadata.entityType === 'view' && !!metadata.viewMetadata;
  }

  /**
   * Adds a column to the specified entity's schema.
   * @param entity - The entity class constructor.
   * @param propertyKey - The property name in the entity.
   * @param options - Column configuration options.
   */
  addColumn<U>(
    entity: ClassConstructor<U>,
    propertyKey: string,
    options: ColumnMetadata,
  ): void {
    this.columnsHandler.setEntity(entity);
    this.columnsHandler.addColumn(propertyKey, options);
  }

  /**
   * Defines a one-to-many relationship for a specific entity.
   * @param entity - The entity class constructor.
   * @param propertyKey - The property name in the entity.
   * @param target - The target entity constructor.
   * @param options - Relation configuration options.
   */
  setOneToMany<U>(
    entity: ClassConstructor<U>,
    propertyKey: string,
    target: ClassConstructor<any>,
    options: Partial<RelationMetadata>,
  ): void {
    this.relationsHandler.setEntity(entity);
    this.relationsHandler.setOneToMany(propertyKey, target, options);
  }

  /**
   * Defines a constraint on a column for a specific entity.
   * @param entity - The entity class constructor.
   * @param propertyKey - The property name in the entity.
   * @param options - Constraint configuration options.
   * @param constraint - The constraint definition.
   */
  setConstraint<U>(
    entity: ClassConstructor<U>,
    propertyKey: string,
    options: Partial<ColumnMetadata>,
    constraint: string,
  ): void {
    this.constraintsHandler.setEntity(entity);
    this.constraintsHandler.setConstraint(propertyKey, options, constraint);
  }

  /**
   * Defines a foreign key on a column for a specific entity.
   * @param entity - The entity class constructor.
   * @param propertyKey - The property name in the entity.
   * @param options - Foreign key configuration options.
   */
  setForeignKey<U>(
    entity: ClassConstructor<U>,
    propertyKey: string,
    options: Partial<ForeignKeyMetadata>,
  ): void {
    this.foreignKeysHandler.setEntity(entity);
    this.foreignKeysHandler.setForeignKey(propertyKey, options);
  }

  /**
   * Defines an index on a column for a specific entity.
   * @param entity - The entity class constructor.
   * @param propertyKey - The property name in the entity.
   * @param options - Index configuration options.
   */
  setIndex<U>(
    entity: ClassConstructor<U>,
    propertyKey: string,
    options: Partial<IndexedColumnMetadata>,
  ): void {
    this.indexesHandler.setEntity(entity);
    this.indexesHandler.setIndex(propertyKey, options);
  }

  /**
   * Defines a default value on a column for a specific entity.
   * @param entity - The entity class constructor.
   * @param propertyKey - The property name in the entity.
   * @param value - The default value.
   */
  setDefaultValue<U>(
    entity: ClassConstructor<U>,
    propertyKey: string,
    value: any,
  ): void {
    this.defaultValuesHandler.setEntity(entity);
    this.defaultValuesHandler.setDefaultValue(propertyKey, value);
  }

  /**
   * Defines a composite key on columns for a specific entity.
   * @param entity - The entity class constructor.
   * @param propertyKeys - The property names in the entity.
   */
  setCompositeKey<U>(
    entity: ClassConstructor<U>,
    propertyKeys: string[],
  ): void {
    this.compositeKeysHandler.setEntity(entity);
    this.compositeKeysHandler.setCompositeKey(propertyKeys);
  }

  /**
   * Defines a primary key on columns for a specific entity.
   * @param entity - The entity class constructor.
   * @param propertyKeys - The property names in the entity.
   * @param options - Primary key configuration options.
   */
  setPrimaryKey<U>(
    entity: ClassConstructor<U>,
    propertyKeys: string[],
    options: Partial<PrimaryKeyMetadata>,
  ): void {
    this.primaryKeysHandler.setEntity(entity);
    propertyKeys.forEach((propertyKey) => {
      this.primaryKeysHandler.setPrimaryKey(propertyKey, options);
    });
  }

  /**
   * Finalizes the schema for all entities by performing validations.
   */
  finalizeSchema(): void {
    this.entities.forEach((entity) => {
      this.validateSchema(entity);
    });
  }

  /**
   * Validates the schema for a specific entity.
   * @param entity - The entity class constructor.
   */
  private validateSchema<U>(entity: ClassConstructor<U>): void {
    const metadata = this.getMetadata(entity);

    if (metadata.entityType === 'table') {
      const tableMeta = metadata.tableMetadata!;
      if (!tableMeta.tableName) {
        throw new Error(`Table name is not set for entity: ${entity.name}`);
      }
      if (tableMeta.columns.length === 0) {
        throw new Error(`No columns defined for table: ${tableMeta.tableName}`);
      }
      if (tableMeta.primaryKeys.length === 0) {
        throw new Error(
          `Primary key not defined for table: ${tableMeta.tableName}`,
        );
      }
    } else if (metadata.entityType === 'view') {
      const viewMeta = metadata.viewMetadata!;
      if (!viewMeta.viewName) {
        throw new Error(`View name is not set for entity: ${entity.name}`);
      }
      if (!viewMeta.underlyingQuery) {
        throw new Error(
          `Underlying query is not set for view: ${viewMeta.viewName}`,
        );
      }
    } else {
      throw new Error(`Unknown entity type for entity: ${entity.name}`);
    }
  }

  /**
   * Retrieves the entity name for a specific entity.
   * @param entity - The entity class constructor.
   */
  getEntityName<U>(entity: ClassConstructor<U>): string {
    return entity.name;
  }

  /**
   * Retrieves all metadata.
   */
  getAllMetadata(): EntityMetadata[] {
    return Array.from(this.metadataMap.values());
  }

  /**
   * Retrieves the entities.
   */
  getEntities(): T {
    return this.entities;
  }
}
