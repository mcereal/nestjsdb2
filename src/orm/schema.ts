// src/orm/schema.ts

import { MetadataUtil } from '../utils/metadata.utils';
import {
  EntityMetadata,
  ColumnMetadata,
  RelationMetadata,
} from '../interfaces';
import { ClassConstructor } from '../types';
import { ColumnsHandler } from './schema-handlers/columns.handler';
import { RelationsHandler } from './schema-handlers/relations.handler';
import { ConstraintsHandler } from './schema-handlers/constraints.handler';

/**
 * Represents the schema definition for an entity.
 * Handles table/view metadata, columns, relations, constraints, etc.
 */
export class Schema<T> {
  private metadata: EntityMetadata;
  private columnsHandler: ColumnsHandler<T>;
  private relationsHandler: RelationsHandler<T>;
  private constraintsHandler: ConstraintsHandler<T>;
  // You can add more handlers as needed (e.g., IndexesHandler)

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
    this.columnsHandler = new ColumnsHandler(this);
    this.relationsHandler = new RelationsHandler(this);
    this.constraintsHandler = new ConstraintsHandler(this);
    // Initialize other handlers here
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

  // Similarly, you can add methods for other operations like setting foreign keys, indexes, etc.

  /**
   * Finalizes the schema by performing validations.
   * Should be called after all schema definitions are done.
   */
  finalizeSchema(): void {
    this.validateSchema();
    // Optionally, register the schema or perform other finalization steps
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
