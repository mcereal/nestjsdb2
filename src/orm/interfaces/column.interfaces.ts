// Purpose: Interfaces for column metadata.

import { ForeignKeyMetadata } from './keys.interfaces';

/**
 * Metadata for a column in a table.
 * Defines the properties and behavior of a column, including type, constraints, and default values.
 * @category Interfaces
 * @since 1.1.9
 *
 * @example
 * ```ts
 * const columnMetadata: ColumnMetadata = {
 *   propertyKey: 'id',
 *   type: 'number',
 *   primary: true,
 *   autoIncrement: true,
 *   nullable: false,
 * };
 * ```
 */
export interface ColumnMetadata {
  /** The property name in the entity that maps to this column. */
  propertyKey: string;

  /** The column name in the database, if different from the property name. */
  name?: string;

  /** The data type of the column (e.g., 'string', 'number'). */
  type: string;

  /** Metadata for the foreign key relationship, if applicable. */
  foreignKey?: ForeignKeyMetadata;

  /** Metadata for indexing the column, if applicable. */
  index?: IndexedColumnMetadata;

  /** The maximum length of the column (for strings or other applicable types). */
  length?: number;

  /** Indicates if the column can have a null value. */
  nullable?: boolean;

  /** The default value of the column, if any. */
  default?: any;

  /** Indicates if the column should have a unique constraint. */
  unique?: boolean;

  /** Indicates if the column is part of the primary key. */
  primary?: boolean;

  /** Indicates if the column value should auto-increment (typically for primary keys). */
  autoIncrement?: boolean;

  /** The action to take on updates ('CASCADE', 'SET NULL', 'RESTRICT'). */
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';

  /** A comment describing the column. */
  comment?: string;

  /** The collation of the column (useful for string comparison). */
  collation?: string;

  /** The character set for the column. */
  charset?: string;

  /** The precision for numeric columns (total number of digits). */
  precision?: number;

  /** The scale for numeric columns (digits to the right of the decimal). */
  scale?: number;

  /** Indicates if the column value should be zero-filled. */
  zerofill?: boolean;

  /** Indicates if the column value is unsigned (for numeric columns). */
  unsigned?: boolean;

  /** Indicates if the column is spatial (e.g., geometry types). */
  spatial?: boolean;

  /** The Spatial Reference System Identifier (SRID) for spatial columns. */
  srid?: number;

  /** The geometry type (e.g., 'POINT', 'LINESTRING') for spatial columns. */
  geometryType?: string;

  /** The SRID for the geometry column. */
  geometrySrid?: number;

  /** The dimension of the geometry column (2D, 3D, etc.). */
  geometryDimension?: number;

  /** A comment describing the geometry type of the column. */
  geometryTypeComment?: string;

  /** The allowed values for an ENUM column. */
  enum?: string[];

  /** The allowed values for a SET column. */
  set?: string[];

  /** Indicates if the column is generated (e.g., computed columns). */
  generated?: boolean;

  /** An expression to define a virtual column. */
  asExpression?: string;

  /** Indicates if the column is virtual (computed at runtime). */
  virtual?: boolean;

  /** Indicates if the virtual column is stored (computed once and stored). */
  stored?: boolean;

  /** Indicates if the column is hidden (not directly accessible in queries). */
  hidden?: boolean;

  /** Indicates if the column should default to the current timestamp. */
  defaultToNow?: boolean;

  /** Indicates if the column should default to the current timestamp on update. */
  defaultToNowOnUpdate?: boolean;

  /** Indicates if the column should default to a generated UUID. */
  defaultToUUID?: boolean;
}

/**
 * Metadata for an indexed column in a table.
 * Defines properties for indexing, including uniqueness, type, and additional options.
 * @category Interfaces
 * @since 1.1.9
 *
 * @example
 * ```ts
 * const indexMetadata: IndexedColumnMetadata = {
 *   propertyKey: 'email',
 *   name: 'email_index',
 *   unique: true,
 *   type: 'BTREE',
 * };
 * ```
 */
export interface IndexedColumnMetadata {
  /** The property name in the entity that maps to this column. */
  propertyKey: string | symbol;

  /** The name of the index in the database. */
  name: string;

  /** Indicates if the index enforces uniqueness. */
  unique?: boolean;

  /** Indicates if the column can have a null value. */
  nullable?: boolean;

  /** The default value for the indexed column. */
  default?: any;

  /** The action to take on updates ('CASCADE', 'SET NULL', 'RESTRICT'). */
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';

  /** The index type (e.g., 'BTREE', 'HASH'). */
  type?: 'BTREE' | 'FULLTEXT' | 'HASH' | 'SPATIAL';

  /** The indexing method (e.g., 'BTREE', 'HASH'). */
  method?: 'BTREE' | 'HASH';

  /** The indexing algorithm (e.g., 'DEFAULT', 'INPLACE'). */
  algorithm?: 'DEFAULT' | 'INPLACE' | 'COPY' | 'NOCOPY';

  /** The parser used for the index (if applicable). */
  parser?: string;

  /** A comment describing the index. */
  comment?: string;

  /** Indicates if the index is invisible (not used by the query planner). */
  invisible?: boolean;

  /** Indicates if the index is functional (based on a function/expression). */
  functional?: boolean;

  /** The expression used for functional indexes. */
  expression?: string;

  /** The columns to include in the index (if applicable). */
  include?: string[];

  /** The prefix length for indexing (if applicable). */
  prefixLength?: number;
}

/**
 * Metadata for default values in a table.
 * Used to specify default values for columns.
 * @category Interfaces
 * @since 1.1.9
 *
 * @example
 * ```ts
 * const defaultMetadata: DefaultMetadata = {
 *   propertyKey: 'createdAt',
 *   value: () => new Date(),
 * };
 * ```
 */
export interface DefaultMetadata {
  /** The property name in the entity that maps to this column. */
  propertyKey: string | symbol;

  /** The default value to set for the column. */
  value: any;
}
