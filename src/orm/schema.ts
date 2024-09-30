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
import {
  validateOrReject,
  registerValidation,
} from '../validation/validateOrReject';
import { ConstraintMetadata } from './interfaces/constraints.interfaces';
import { Logger } from '../utils';

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
  private logger = new Logger('Schema');
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

      // Register validation rules for entities
      this.entities.forEach((entity) => {
        this.registerEntityValidation(entity);
      });
    } catch (error: any) {
      throw new Error(`Failed to initialize Schema: ${error.message}`);
    }
  }

  /**
   * Registers validation rules for a given entity.
   * This method should define the validation rules for the entity's properties.
   * @param entity - The class constructor of the entity.
   */
  private registerEntityValidation<U>(entity: ClassConstructor<U>): void {
    const validationRules = {
      // Define validation rules for the entity's properties
      columnName: [
        (value: any) => (value ? null : 'Column name cannot be empty'),
      ],
      name: [(value: any) => (value ? null : 'Name cannot be empty')],
    };

    registerValidation(entity, validationRules);
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
   * Adds a column to the specified entity's schema with validation.
   * @param entity - The entity class constructor.
   * @param propertyKey - The property name in the entity.
   * @param options - Column configuration options.
   */
  async addColumn<U>(
    entity: ClassConstructor<U>,
    propertyKey: string,
    options: ColumnMetadata,
  ): Promise<void> {
    try {
      await validateOrReject(entity);

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
   * Defines a foreign key on a column for a specific entity with validation.
   * @param entity - The entity class constructor.
   * @param propertyKey - The property name in the entity.
   * @param options - Foreign key configuration options.
   */
  async setForeignKey<U>(
    entity: ClassConstructor<U>,
    propertyKey: string,
    options: Partial<ForeignKeyMetadata>,
  ): Promise<void> {
    try {
      // Validate the entity's current state before making changes
      await validateOrReject(entity);

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
  async finalizeSchema(): Promise<void> {
    try {
      for (const entity of this.entities) {
        await validateOrReject(entity);
        this.validateSchema(entity);
      }
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

        // Set default tableName if not provided
        if (!tableMeta.tableName) {
          tableMeta.tableName = this.toSnakeCase(entity.name) + 's'; // Example: 'Post' -> 'posts'
        }

        // Validate table name
        if (!tableMeta.tableName) {
          throw new Error(`Table name is not set for entity: ${entity.name}`);
        }

        // Validate columns
        if (tableMeta.columns.length === 0) {
          throw new Error(
            `No columns defined for table: ${tableMeta.tableName}`,
          );
        }
        this.validateColumns(tableMeta.columns, entity);

        // Validate primary keys
        if (tableMeta.primaryKeys.length === 0) {
          throw new Error(
            `Primary key not defined for table: ${tableMeta.tableName}`,
          );
        }
        this.validatePrimaryKeys(
          tableMeta.primaryKeys,
          tableMeta.columns,
          entity,
        );

        // Validate foreign keys
        this.validateForeignKeys(tableMeta.foreignKeys, entity);

        // Validate constraints
        this.validateConstraints(tableMeta.constraints, entity);
      } else if (metadata.entityType === 'view') {
        const viewMeta = metadata.viewMetadata!;

        // Validate view name
        if (!viewMeta.viewName) {
          throw new Error(`View name is not set for entity: ${entity.name}`);
        }

        // Validate underlying query
        if (!viewMeta.underlyingQuery) {
          throw new Error(
            `Underlying query is not set for view: ${viewMeta.viewName}`,
          );
        }

        // Validate columns in view
        this.validateColumns(viewMeta.columns, entity);
      } else {
        throw new Error(`Unknown entity type for entity: ${entity.name}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to validate schema for entity '${entity.name}': ${error.message}`,
      );
    }
  }

  // Helper method to convert PascalCase to snake_case (example implementation)
  private toSnakeCase(name: string): string {
    return name
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }

  // Helper method to validate columns
  private validateColumns(
    columns: ColumnMetadata[],
    entity: ClassConstructor<any>,
  ): void {
    const columnNames = new Set<string>();
    columns.forEach((column, index) => {
      if (!column.name) {
        this.logger.error(
          `Column at index ${index} in entity '${entity.name}' has no name.`,
        );
        this.logger.error(`Column: ${JSON.stringify(column)}`);
        this.logger.error(`Entity: ${JSON.stringify(entity)}`);
        throw new Error(
          `Column at index ${index} in entity '${entity.name}' has no name.`,
        );
      }
      if (columnNames.has(column.name)) {
        throw new Error(
          `Duplicate column name '${column.name}' found in entity '${entity.name}'.`,
        );
      }
      columnNames.add(column.name);

      if (!column.type) {
        throw new Error(
          `Column '${column.name}' in entity '${entity.name}' has no type defined.`,
        );
      } else if (!column.propertyKey) {
        throw new Error(
          `Column '${column.name}' in entity '${entity.name}' has no property key defined.`,
        );
      }
    });
  }

  // Helper method to validate primary keys
  // Helper method to validate primary keys
  private validatePrimaryKeys(
    primaryKeys: PrimaryKeyMetadata[],
    columns: ColumnMetadata[],
    entity: ClassConstructor<any>,
  ): void {
    const columnNames = columns.map((col) => col.name);
    primaryKeys.forEach((pk, index) => {
      console.log(
        `Validating primary key ${index} for entity '${entity.name}':`,
        pk,
      );

      if (!pk.propertyKey) {
        // Changed from columnName to propertyKey
        throw new Error(
          `Primary key at index ${index} in entity '${entity.name}' has no property key.`,
        );
      }
      if (!columnNames.includes(pk.propertyKey)) {
        // Changed from columnName to propertyKey
        throw new Error(
          `Primary key '${pk.propertyKey}' in entity '${entity.name}' is not a valid column.`,
        );
      } else if (pk.propertyKey && !pk.name) {
        throw new Error(
          `Primary key '${pk.propertyKey}' in entity '${entity.name}' has no name defined.`,
        );
      }
    });
  }

  // Helper method to validate foreign keys
  private validateForeignKeys(
    foreignKeys: ForeignKeyMetadata[],
    entity: ClassConstructor<any>,
  ): void {
    foreignKeys.forEach((fk, index) => {
      if (!fk.columnNames) {
        throw new Error(
          `Foreign key at index ${index} in entity '${entity.name}' has no column name.`,
        );
      }
      if (!fk.referencedTable) {
        throw new Error(
          `Foreign key '${fk.columnNames}' in entity '${entity.name}' has no referenced table defined.`,
        );
      }
      if (!fk.referencedColumnNames) {
        throw new Error(
          `Foreign key '${fk.columnNames}' in entity '${entity.name}' has no referenced column defined.`,
        );
      } else if (fk.columnNames.length !== fk.referencedColumnNames.length) {
        throw new Error(
          `Foreign key '${fk.columnNames}' in entity '${entity.name}' has a mismatch in column and referenced column length.`,
        );
      }
    });
  }

  // Helper method to validate constraints
  private validateConstraints(
    constraints: ConstraintMetadata[],
    entity: ClassConstructor<any>,
  ): void {
    constraints.forEach((constraint, index) => {
      if (!constraint.constraint.name) {
        throw new Error(
          `Constraint at index ${index} in entity '${entity.name}' has no name.`,
        );
      } else if (!constraint.constraint.type) {
        throw new Error(
          `Constraint '${constraint.constraint.name}' in entity '${entity.name}' has no type defined.`,
        );
      }
    });
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
