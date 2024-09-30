// Purpose: Interfaces for entity metadata.

import {
  ColumnMetadata,
  IndexedColumnMetadata,
  DefaultMetadata,
} from './column.interfaces';
import {
  CompositeKeyMetadata,
  PrimaryKeyMetadata,
  ForeignKeyMetadata,
} from './keys.interfaces';
import { ConstraintMetadata } from './constraints.interfaces';
import {
  ManyToOneMetadata,
  ManyToManyMetadata,
  OneToOneMetadata,
  OneToManyMetadata,
} from './relations.interfaces';

/**
 * Metadata for a table in a database schema.
 * Defines the properties of a table, including its columns, primary keys, foreign keys, and constraints.
 * @category Interfaces
 * @since 1.1.9
 *
 * @example
 * ```ts
 * const tableMetadata: TableMetadata = {
 *   tableName: 'users',
 *   schemaName: 'public',
 *   columns: [...],
 *   primaryKeys: [...],
 *   foreignKeys: [...],
 * };
 * ```
 */
export interface TableMetadata {
  /** The name of the table in the database. */
  tableName: string;

  /** The name of the schema to which the table belongs. */
  schemaName: string;

  /** A description of the table. */
  description?: string;

  /** The owner of the table. */
  owner?: string;

  /** The underlying query for tables derived from queries (e.g., materialized views). */
  underlyingQuery?: string;

  /** An array of metadata for the columns in the table. */
  columns: ColumnMetadata[];

  /** An array of metadata for the primary keys in the table. */
  primaryKeys: PrimaryKeyMetadata[];

  /** An array of metadata for the indexed columns in the table. */
  indexedColumns: IndexedColumnMetadata[];

  /** An array of metadata for the foreign keys in the table. */
  foreignKeys: ForeignKeyMetadata[];

  /** An array of metadata for one-to-one relationships in the table. */
  oneToOneRelations: OneToOneMetadata[];

  /** An array of metadata for one-to-many relationships in the table. */
  oneToManyRelations: OneToManyMetadata[];

  /** An array of metadata for many-to-one relationships in the table. */
  manyToOneRelations: ManyToOneMetadata[];

  /** An array of metadata for many-to-many relationships in the table. */
  manyToManyRelations: ManyToManyMetadata[];

  /** An array of metadata for default values in the table. */
  defaultValues: DefaultMetadata[];

  /** An array of metadata for constraints (e.g., UNIQUE, CHECK) in the table. */
  constraints: ConstraintMetadata[];

  /** An array of metadata for composite keys in the table. */
  compositeKeys: CompositeKeyMetadata[];
}

/**
 * Metadata for a view in a database schema.
 * Defines the properties of a view, including its columns and underlying query.
 * @category Interfaces
 * @since 1.1.9
 *
 * @example
 * ```ts
 * const viewMetadata: ViewMetadata = {
 *   viewName: 'active_users_view',
 *   schemaName: 'public',
 *   columns: [...],
 *   underlyingQuery: 'SELECT * FROM users WHERE active = TRUE',
 * };
 * ```
 */
export interface ViewMetadata {
  /** The name of the view in the database. */
  viewName: string;

  /** The name of the schema to which the view belongs. */
  schemaName: string;

  /** An array of metadata for the columns in the view. */
  columns: ColumnMetadata[];

  /** The SQL query that defines the view. */
  underlyingQuery: string;
}

/**
 * Metadata for a database schema.
 * Defines the properties of a schema, including its tables and views.
 * @category Interfaces
 * @since 1.1.9
 *
 * @example
 * ```ts
 * const schemaMetadata: SchemaMetadata = {
 *   schemaName: 'public',
 *   tables: [...],
 *   views: [...],
 * };
 * ```
 */
export interface SchemaMetadata {
  /** The name of the schema. */
  schemaName: string;

  /** A description of the schema. */
  description?: string;

  /** The owner of the schema. */
  owner?: string;

  /** An array of metadata for tables in the schema. */
  tables: TableMetadata[];

  /** An array of metadata for views in the schema. */
  views: ViewMetadata[];
}

/**
 * Represents the type of an entity in a database schema.
 * Can be either 'table' or 'view'.
 * @category Interfaces
 * @since 1.1.9
 *
 * @example
 * ```ts
 * const entityType: EntityType = 'table';
 * ```
 */
export type EntityType = 'table' | 'view';

/**
 * Metadata for an entity in a database schema.
 * Defines the properties of an entity, which can be a table or a view.
 * @category Interfaces
 * @since 1.1.9
 *
 * @example
 * ```ts
 * const entityMetadata: EntityMetadata = {
 *   entityType: 'table',
 *   name: 'users',
 *   tableMetadata: {...},
 * };
 * ```
 */
export interface EntityMetadata {
  /** The type of the entity ('table' or 'view'). */
  entityType: EntityType;

  /** The name of the entity (table or view). */
  name: string;

  /** Metadata for the table, if the entity is a table. */
  tableMetadata?: TableMetadata;

  /** Metadata for the view, if the entity is a view. */
  viewMetadata?: ViewMetadata;
}
