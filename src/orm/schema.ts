// src/orm/schema.ts

import { MetadataUtil } from '../utils/metadata.utils';
import {
  EntityMetadata,
  ColumnMetadata,
  RelationMetadata,
  ForeignKeyMetadata,
  IndexedColumnMetadata,
} from '../interfaces';
import { ClassConstructor } from '../types';
import { ColumnsHandler } from './schema-handlers/columns.handler';
import { RelationsHandler } from './schema-handlers/relations.handler';
import { ConstraintsHandler } from './schema-handlers/constraints.handler';
import { IndexesHandler } from './schema-handlers/indexes.handler';
import { ForeignKeysHandler } from './schema-handlers/foreign-keys.handler';
import { DefaultValuesHandler } from './schema-handlers/default-values.handler';
import { CompositeKeysHandler } from './schema-handlers/composite-keys.handler';

/**
 * Represents the schema definition for an entity.
 * Handles table/view metadata, columns, relations, constraints, etc.
 */
export class Schema<T> {
  private metadata: EntityMetadata;
  private columnsHandler: ColumnsHandler<T>;
  private relationsHandler: RelationsHandler<T>;
  private constraintsHandler: ConstraintsHandler<T>;
  private indexesHandler: IndexesHandler<T>;
  private foreignKeysHandler: ForeignKeysHandler<T>;
  private defaultValuesHandler: DefaultValuesHandler<T>;
  private compositeKeysHandler: CompositeKeysHandler<T>;

  /**
   * Initializes the Schema with the given entity.
   * @param entity - The class constructor of the entity.
   */
  constructor(private entity: ClassConstructor<T>) {
    const metadata = MetadataUtil.getEntityMetadata(this.entity);
    if (!metadata) {
      throw new Error(`No metadata found for entity: ${this.entity.name}`);
    }
    this.metadata = metadata;

    // Initialize handlers
    this.columnsHandler = new ColumnsHandler(this);
    this.relationsHandler = new RelationsHandler(this);
    this.constraintsHandler = new ConstraintsHandler(this);
    this.indexesHandler = new IndexesHandler(this);
    this.foreignKeysHandler = new ForeignKeysHandler(this);
    this.defaultValuesHandler = new DefaultValuesHandler(this);
    this.compositeKeysHandler = new CompositeKeysHandler(this);
  }

  /**
   * Checks if the entity is a table.
   */
  isTable(): boolean {
    return (
      this.metadata.entityType === 'table' && !!this.metadata.tableMetadata
    );
  }

  /**
   * Checks if the entity is a view.
   */
  isView(): boolean {
    return this.metadata.entityType === 'view' && !!this.metadata.viewMetadata;
  }

  /**
   * Adds a column to the table schema.
   * @param propertyKey - The property name in the entity.
   * @param options - Column configuration options.
   */
  addColumn(propertyKey: string, options: ColumnMetadata): void {
    this.columnsHandler.addColumn(propertyKey, options);
  }

  /**
   * Defines a one-to-many relationship.
   * @param propertyKey - The property name in the entity.
   * @param target - The target entity constructor.
   * @param options - Relation configuration options.
   */
  setOneToMany(
    propertyKey: string,
    target: ClassConstructor<any>,
    options: Partial<RelationMetadata>,
  ): void {
    this.relationsHandler.setOneToMany(propertyKey, target, options);
  }

  /**
   * Defines a constraint on a column.
   * @param propertyKey - The property name in the entity.
   * @param options - Constraint configuration options.
   * @param constraint - The constraint definition.
   */
  setConstraint(
    propertyKey: string,
    options: Partial<ColumnMetadata>,
    constraint: string,
  ): void {
    this.constraintsHandler.setConstraint(propertyKey, options, constraint);
  }

  /**
   * Defines a foreign key on a column.
   * @param propertyKey - The property name in the entity.
   * @param options - Foreign key configuration options.
   */
  setForeignKey(
    propertyKey: string,
    options: Partial<ForeignKeyMetadata>,
  ): void {
    this.foreignKeysHandler.setForeignKey(propertyKey, options);
  }

  /**
   * Defines an index on a column.
   * @param propertyKey - The property name in the entity.
   * @param options - Index configuration options.
   */
  setIndex(propertyKey: string, options: Partial<IndexedColumnMetadata>): void {
    this.indexesHandler.setIndex(propertyKey, options);
  }

  /**
   * Defines a default value on a column.
   * @param propertyKey - The property name in the entity.
   * @param value - The default value.
   */
  setDefaultValue(propertyKey: string, value: any): void {
    this.defaultValuesHandler.setDefaultValue(propertyKey, value);
  }

  /**
   * Defines a composite key on columns.
   * @param propertyKeys - The property names in the entity.
   */
  setCompositeKey(propertyKeys: string[]): void {
    this.compositeKeysHandler.setCompositeKey(propertyKeys);
  }

  /**
   * Finalizes the schema by performing validations.
   * Should be called after all schema definitions are done.
   */
  finalizeSchema(): void {
    this.validateSchema();
  }

  /**
   * Validates the schema for completeness and correctness.
   */
  private validateSchema(): void {
    if (this.isTable()) {
      const tableMeta = this.metadata.tableMetadata!;
      if (!tableMeta.tableName) {
        throw new Error(
          `Table name is not set for entity: ${this.entity.name}`,
        );
      }
      if (tableMeta.columns.length === 0) {
        throw new Error(`No columns defined for table: ${tableMeta.tableName}`);
      }
      if (tableMeta.primaryKeys.length === 0) {
        throw new Error(
          `Primary key not defined for table: ${tableMeta.tableName}`,
        );
      }
      // Add more validations as needed
    } else if (this.isView()) {
      const viewMeta = this.metadata.viewMetadata!;
      if (!viewMeta.viewName) {
        throw new Error(`View name is not set for entity: ${this.entity.name}`);
      }
      if (!viewMeta.underlyingQuery) {
        throw new Error(
          `Underlying query is not set for view: ${viewMeta.viewName}`,
        );
      }
      // Add more validations as needed
    } else {
      throw new Error(`Unknown entity type for entity: ${this.entity.name}`);
    }
  }

  /**
   * Retrieves the entity name.
   */
  getEntityName(): string {
    return this.entity.name;
  }

  /**
   * Retrieves the entity metadata.
   */
  getMetadata(): EntityMetadata {
    return this.metadata;
  }

  /**
   * Retrieves the entity constructor.
   */
  getConstructor(): ClassConstructor<T> {
    return this.entity;
  }
}
