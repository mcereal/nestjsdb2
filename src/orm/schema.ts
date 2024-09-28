// src/orm/schema.ts
import { EntityMetadata, ColumnMetadata } from '../interfaces';
import { EntityMetadataStorage } from '../metadata';
import { ClassConstructor } from '../types';

export class Schema {
  private metadata: EntityMetadata;

  constructor(target: ClassConstructor) {
    // Retrieve or create entity metadata
    this.metadata = EntityMetadataStorage.getEntityMetadata(target) || {
      entityType: 'table',
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
    };
  }

  // Determine if the entity is a table
  private isTable() {
    return this.metadata.entityType === 'table' && this.metadata.tableMetadata;
  }

  // Determine if the entity is a view
  private isView() {
    return this.metadata.entityType === 'view' && this.metadata.viewMetadata;
  }

  // Define a column in the schema
  addColumn(propertyKey: string, options: ColumnMetadata) {
    if (this.isTable()) {
      const columnMetadata: ColumnMetadata = { ...options, propertyKey };
      this.metadata.tableMetadata!.columns.push(columnMetadata);
    }
  }

  // Retrieve the metadata
  getMetadata(): EntityMetadata {
    return this.metadata;
  }

  // Set the table name
  setTableName(tableName: string) {
    if (this.isTable()) {
      this.metadata.tableMetadata!.tableName = tableName;
    }
  }

  // Set the schema name
  setSchemaName(schemaName: string) {
    if (this.isTable()) {
      this.metadata.tableMetadata!.schemaName = schemaName;
    } else if (this.isView()) {
      this.metadata.viewMetadata!.schemaName = schemaName;
    }
  }

  // Set the primary key
  setPrimaryKey(propertyKey: string, options: ColumnMetadata) {
    if (this.isTable()) {
      const primaryKeyMetadata = { propertyKey, ...options };
      this.metadata.tableMetadata!.primaryKeys.push(primaryKeyMetadata);
    }
  }

  // Set the indexed column
  setIndexedColumn(propertyKey: string, options: ColumnMetadata) {
    if (this.isTable()) {
      const indexedColumnMetadata = {
        name: propertyKey,
        propertyKey,
        ...options,
        type: options.type as 'BTREE' | 'FULLTEXT' | 'HASH' | 'SPATIAL',
      };
      this.metadata.tableMetadata!.indexedColumns.push(indexedColumnMetadata);
    }
  }

  // Set the column
  setColumn(propertyKey: string, options: ColumnMetadata) {
    this.addColumn(propertyKey, options);
  }

  // Set the foreign key
  setForeignKey(
    propertyKey: string,
    options: ColumnMetadata,
    reference: string,
  ) {
    if (this.isTable()) {
      const foreignKeyMetadata = { propertyKey, ...options, reference };
      this.metadata.tableMetadata!.foreignKeys.push(foreignKeyMetadata);
    }
  }

  // Set the one-to-one relation
  setOneToOne(
    propertyKey: string,
    target: ClassConstructor,
    options: ColumnMetadata,
  ) {
    if (this.isTable()) {
      const oneToOneMetadata = { propertyKey, target, ...options };
      this.metadata.tableMetadata!.oneToOneRelations.push(oneToOneMetadata);
    }
  }

  // Set the one-to-many relation
  setOneToMany(
    propertyKey: string,
    target: ClassConstructor,
    options: ColumnMetadata,
  ) {
    if (this.isTable()) {
      const oneToManyMetadata = { propertyKey, target, ...options };
      this.metadata.tableMetadata!.oneToManyRelations.push(oneToManyMetadata);
    }
  }

  // Set the many-to-one relation
  setManyToOne(
    propertyKey: string,
    target: ClassConstructor,
    options: ColumnMetadata,
  ) {
    if (this.isTable()) {
      const manyToOneMetadata = { propertyKey, target, ...options };
      this.metadata.tableMetadata!.manyToOneRelations.push(manyToOneMetadata);
    }
  }

  // Set the many-to-many relation
  setManyToMany(
    propertyKey: string,
    target: ClassConstructor,
    options: ColumnMetadata,
  ) {
    if (this.isTable()) {
      const manyToManyMetadata = { propertyKey, target, ...options };
      this.metadata.tableMetadata!.manyToManyRelations.push(manyToManyMetadata);
    }
  }

  // Set the default value
  setDefaultValue(propertyKey: string, options: ColumnMetadata, value: any) {
    if (this.isTable()) {
      const defaultMetadata = { propertyKey, ...options, value };
      this.metadata.tableMetadata!.defaultValues.push(defaultMetadata);
    }
  }

  // Set the constraint
  setConstraint(
    propertyKey: string,
    options: ColumnMetadata,
    constraint: string,
  ) {
    if (this.isTable()) {
      const constraintMetadata = { propertyKey, ...options, constraint };
      this.metadata.tableMetadata!.constraints.push(constraintMetadata);
    }
  }

  // Set the composite key
  setCompositeKey(
    propertyKey: string,
    options: ColumnMetadata,
    keys: string[],
  ) {
    if (this.isTable()) {
      const compositeKeyMetadata = { propertyKey, ...options, keys };
      this.metadata.tableMetadata!.compositeKeys.push(compositeKeyMetadata);
    }
  }

  // Set the description
  setDescription(description: string) {
    if (this.isTable()) {
      this.metadata.tableMetadata!.description = description;
    }
  }

  // Set the owner
  setOwner(owner: string) {
    if (this.isTable()) {
      this.metadata.tableMetadata!.owner = owner;
    }
  }

  // Set the underlying query (only for views)
  setUnderlyingQuery(underlyingQuery: string) {
    if (this.isView()) {
      this.metadata.viewMetadata!.underlyingQuery = underlyingQuery;
    }
  }

  // Set the view name
  setViewName(viewName: string) {
    if (this.isView()) {
      this.metadata.viewMetadata!.viewName = viewName;
    }
  }

  // Set the view schema name
  setViewSchemaName(viewSchemaName: string) {
    if (this.isView()) {
      this.metadata.viewMetadata!.schemaName = viewSchemaName;
    }
  }
}
