import { MetadataManager } from './metadata/metadata-manager';
import { EntityMetadata } from './interfaces/entity-metadata.interfaces';
import { ClassConstructor } from './types';
import { ColumnsHandler } from './schema-handlers/columns.handler';
import { RelationsHandler } from './schema-handlers/relations.handler';
import { ConstraintsHandler } from './schema-handlers/constraints.handler';
import { IndexesHandler } from './schema-handlers/indexes.handler';
import { ForeignKeysHandler } from './schema-handlers/foreign-keys.handler';
import { DefaultValuesHandler } from './schema-handlers/default-values.handler';
import { CompositeKeysHandler } from './schema-handlers/composite-keys.handler';
import { PrimaryKeysHandler } from './schema-handlers/primary-keys.handler';
import {
  ColumnMetadata,
  IndexedColumnMetadata,
} from './interfaces/column.interfaces';
import { RelationMetadata } from './interfaces/relations.interfaces';
import {
  ForeignKeyMetadata,
  PrimaryKeyMetadata,
} from './interfaces/keys.interfaces';

/**
 * Represents the schema definition for multiple entities.
 * Handles table/view metadata, columns, relations, constraints, etc.
 * @noInheritDoc
 * @category Schema
 * @template T - Array of class constructors representing the entities.
 *
 * @example
 * ```ts
 * const schema = new Schema([User, Post]);
 * ```
 */
export class Schema<T extends ClassConstructor<any>[]> {
  private currentEntity?: ClassConstructor<any>;
  private metadataManager: MetadataManager;

  private columnsHandler: ColumnsHandler;
  private relationsHandler: RelationsHandler;
  private constraintsHandler: ConstraintsHandler;
  private indexesHandler: IndexesHandler;
  private foreignKeysHandler: ForeignKeysHandler;
  private defaultValuesHandler: DefaultValuesHandler;
  private compositeKeysHandler: CompositeKeysHandler;
  private primaryKeysHandler: PrimaryKeysHandler;

  constructor(private entities: T) {
    try {
      // Initialize MetadataManager
      this.metadataManager = new MetadataManager();

      this.entities.forEach((entity) => {
        // Use MetadataManager to ensure metadata is initialized
        this.metadataManager.getEntityMetadata(entity);
      });

      // Initialize handlers
      this.columnsHandler = new ColumnsHandler(this);
      this.relationsHandler = new RelationsHandler(this);
      this.constraintsHandler = new ConstraintsHandler(this);
      this.indexesHandler = new IndexesHandler(this);
      this.foreignKeysHandler = new ForeignKeysHandler(this);
      this.defaultValuesHandler = new DefaultValuesHandler(this);
      this.compositeKeysHandler = new CompositeKeysHandler(this);
      this.primaryKeysHandler = new PrimaryKeysHandler(this);
    } catch (error: any) {
      throw new Error(`Failed to initialize Schema: ${error.message}`);
    }
  }

  /**
   * Get the metadata for a specific entity using MetadataManager.
   * @param entity - The class constructor of the entity.
   * @throws Will throw an error if metadata for the entity is not found.
   */
  public getMetadata<U>(entity: ClassConstructor<U>): EntityMetadata {
    try {
      const metadata = this.metadataManager.getEntityMetadata(entity);
      if (!metadata) {
        throw new Error('Metadata is undefined or null');
      }

      // Set the schema name if it's not already set
      if (!metadata.schemaName) {
        metadata.schemaName = 'public'; // Default schema if not specified
      }

      return metadata;
    } catch (error: any) {
      throw new Error(
        `Failed to get metadata for entity '${entity.name}': ${error.message}`,
      );
    }
  }

  /**
   * Get the metadata for the currently set entity using MetadataManager.
   * @throws Will throw an error if no current entity is set.
   */
  getCurrentMetadata(): EntityMetadata {
    try {
      if (!this.currentEntity) {
        throw new Error('No entity is currently set in the schema.');
      }
      return this.metadataManager.getEntityMetadata(this.currentEntity);
    } catch (error: any) {
      throw new Error(`Failed to get current metadata: ${error.message}`);
    }
  }

  /**
   * Set the current entity context.
   * @param entity - The class constructor of the entity.
   * @throws Will throw an error if the entity is not part of this schema.
   */
  setEntity(entity: ClassConstructor<any>): void {
    try {
      if (!this.entities.includes(entity)) {
        throw new Error(`Entity '${entity.name}' is not part of this schema.`);
      }
      this.currentEntity = entity;
    } catch (error: any) {
      throw new Error(
        `Failed to set entity '${entity.name}': ${error.message}`,
      );
    }
  }

  /**
   * Checks if the entity is a table.
   * @param entity - The entity class constructor.
   * @returns True if the entity is a table, otherwise false.
   */
  isTable<U>(entity: ClassConstructor<U>): boolean {
    try {
      const metadata = this.getMetadata(entity);
      return metadata.entityType === 'table' && !!metadata.tableMetadata;
    } catch (error) {
      throw new Error(
        `Failed to check if entity '${entity.name}' is a table: ${error.message}`,
      );
    }
  }

  /**
   * Checks if the entity is a view.
   * @param entity - The entity class constructor.
   * @returns True if the entity is a view, otherwise false.
   */
  isView<U>(entity: ClassConstructor<U>): boolean {
    try {
      const metadata = this.getMetadata(entity);
      return metadata.entityType === 'view' && !!metadata.viewMetadata;
    } catch (error) {
      throw new Error(
        `Failed to check if entity '${entity.name}' is a view: ${error.message}`,
      );
    }
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
    try {
      this.columnsHandler.setEntity(entity);
      this.columnsHandler.addColumn(propertyKey, options);
    } catch (error) {
      throw new Error(
        `Failed to add column '${propertyKey}' to entity '${entity.name}': ${error.message}`,
      );
    }
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
    try {
      this.relationsHandler.setEntity(entity);
      this.relationsHandler.setOneToMany(propertyKey, target, options);
    } catch (error) {
      throw new Error(
        `Failed to set one-to-many relation on property '${propertyKey}' in entity '${entity.name}': ${error.message}`,
      );
    }
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
    try {
      this.constraintsHandler.setEntity(entity);
      this.constraintsHandler.setConstraint(propertyKey, options, constraint);
    } catch (error) {
      throw new Error(
        `Failed to set constraint '${constraint}' on property '${propertyKey}' in entity '${entity.name}': ${error.message}`,
      );
    }
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
    try {
      this.foreignKeysHandler.setEntity(entity);
      this.foreignKeysHandler.setForeignKey(propertyKey, options);
    } catch (error) {
      throw new Error(
        `Failed to set foreign key on property '${propertyKey}' in entity '${entity.name}': ${error.message}`,
      );
    }
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
    try {
      this.indexesHandler.setEntity(entity);
      this.indexesHandler.setIndex(propertyKey, options);
    } catch (error) {
      throw new Error(
        `Failed to set index on property '${propertyKey}' in entity '${entity.name}': ${error.message}`,
      );
    }
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
    try {
      this.defaultValuesHandler.setEntity(entity);
      this.defaultValuesHandler.setDefaultValue(propertyKey, value);
    } catch (error) {
      throw new Error(
        `Failed to set default value for property '${propertyKey}' in entity '${entity.name}': ${error.message}`,
      );
    }
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
    try {
      this.compositeKeysHandler.setEntity(entity);
      this.compositeKeysHandler.setCompositeKey(propertyKeys);
    } catch (error) {
      throw new Error(
        `Failed to set composite key on properties '${propertyKeys.join(', ')}' in entity '${entity.name}': ${error.message}`,
      );
    }
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
    try {
      this.primaryKeysHandler.setEntity(entity);
      propertyKeys.forEach((propertyKey) => {
        this.primaryKeysHandler.setPrimaryKey(propertyKey, options);
      });
    } catch (error) {
      throw new Error(
        `Failed to set primary key on properties '${propertyKeys.join(', ')}' in entity '${entity.name}': ${error.message}`,
      );
    }
  }

  /**
   * Finalizes the schema for all entities by performing validations.
   */
  finalizeSchema(): void {
    try {
      this.entities.forEach((entity) => {
        this.validateSchema(entity);
      });
    } catch (error) {
      throw new Error(`Failed to finalize schema: ${error.message}`);
    }
  }

  /**
   * Validates the schema for a specific entity.
   * @param entity - The entity class constructor.
   */
  private validateSchema<U>(entity: ClassConstructor<U>): void {
    try {
      const metadata = this.getMetadata(entity);

      if (metadata.entityType === 'table') {
        const tableMeta = metadata.tableMetadata!;
        if (!tableMeta.tableName) {
          throw new Error(`Table name is not set for entity: ${entity.name}`);
        }
        if (tableMeta.columns.length === 0) {
          throw new Error(
            `No columns defined for table: ${tableMeta.tableName}`,
          );
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
    } catch (error) {
      throw new Error(
        `Failed to validate schema for entity '${entity.name}': ${error.message}`,
      );
    }
  }

  /**
   * Retrieves the entity name for a specific entity.
   * @param entity - The entity class constructor.
   */
  getEntityName<U>(entity: ClassConstructor<U>): string {
    try {
      return entity.name;
    } catch (error) {
      throw new Error(`Failed to get entity name: ${error.message}`);
    }
  }

  /**
   * Retrieves all metadata using MetadataManager.
   * @returns An array of all entity metadata.
   */
  getAllMetadata(): EntityMetadata[] {
    try {
      return this.entities.map((entity) =>
        this.metadataManager.getEntityMetadata(entity),
      );
    } catch (error) {
      throw new Error(`Failed to retrieve all metadata: ${error.message}`);
    }
  }

  /**
   * Retrieves the entities.
   * @returns The entities array.
   */
  getEntities(): T {
    try {
      return this.entities;
    } catch (error) {
      throw new Error(`Failed to retrieve entities: ${error.message}`);
    }
  }
}
