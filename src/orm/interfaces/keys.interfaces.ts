// Purpose: Interfaces for keys metadata.

import { EntityMetadata } from '../interfaces';

/**
 * Metadata for a primary key in a table.
 * Defines the properties and behavior of the primary key, including constraints, type, and generation options.
 * @category Interfaces
 * @since 1.1.9
 *
 * @example
 * ```ts
 * const primaryKeyMetadata: PrimaryKeyMetadata = {
 *   propertyKey: 'id',
 *   name: 'pk_id',
 *   type: 'number',
 *   autoIncrement: true,
 *   unique: true,
 * };
 * ```
 */
export interface PrimaryKeyMetadata {
  /** The property name in the entity that maps to this primary key column. */
  propertyKey: string;

  /** The name of the primary key in the database, if different from the property name. */
  name?: string;

  /** The length of the primary key (for applicable types). */
  length?: number;

  /** The data type of the primary key (e.g., 'string', 'number'). */
  type?: string;

  /** Indicates if the primary key is generated (e.g., auto-generated UUIDs). */
  generated?: boolean;

  /** Indicates if the primary key is unique (implicitly true for primary keys). */
  unique?: boolean;

  /** Indicates if the primary key can be null (not recommended for primary keys). */
  nullable?: boolean;

  /** The default value of the primary key, if any. */
  default?: any;

  /** The action to take on updates ('CASCADE', 'SET NULL', 'RESTRICT'). */
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';

  /** Indicates if the primary key is an auto-incrementing value. */
  autoIncrement?: boolean;

  /** A comment describing the primary key. */
  comment?: string;

  /** The collation of the primary key (useful for string comparison). */
  collation?: string;

  /** The character set for the primary key column. */
  charset?: string;

  /** The precision for numeric primary keys (total number of digits). */
  precision?: number;

  /** The scale for numeric primary keys (digits to the right of the decimal). */
  scale?: number;

  /** Indicates if the primary key should be zero-filled. */
  zerofill?: boolean;

  /** Indicates if the primary key is unsigned (for numeric types). */
  unsigned?: boolean;

  /** Indicates if the primary key is spatial (e.g., geometry types). */
  spatial?: boolean;

  /** The Spatial Reference System Identifier (SRID) for spatial primary keys. */
  srid?: number;

  /** The geometry type (e.g., 'POINT', 'LINESTRING') for spatial primary keys. */
  geometryType?: string;

  /** The SRID for the geometry column in the primary key. */
  geometrySrid?: number;

  /** The dimension of the geometry column (2D, 3D, etc.). */
  geometryDimension?: number;

  /** A comment describing the geometry type of the primary key. */
  geometryTypeComment?: string;

  /** The allowed values for an ENUM primary key. */
  enum?: string[];

  /** The allowed values for a SET primary key. */
  set?: string[];

  /** An expression to define a virtual primary key. */
  asExpression?: string;

  /** Indicates if the primary key is virtual (computed at runtime). */
  virtual?: boolean;

  /** Indicates if the virtual primary key is stored (computed once and stored). */
  stored?: boolean;

  /** Indicates if the primary key is hidden (not directly accessible in queries). */
  hidden?: boolean;

  /** Indicates if the primary key should default to the current timestamp. */
  defaultToNow?: boolean;

  /** Indicates if the primary key should default to the current timestamp on update. */
  defaultToNowOnUpdate?: boolean;

  /** Indicates if the primary key should default to a generated UUID. */
  defaultToUUID?: boolean;
}

/**
 * Metadata for a composite key in a table.
 * Defines a combination of columns that form a unique key in the table.
 * @category Interfaces
 * @since 1.1.9
 *
 * @example
 * ```ts
 * const compositeKeyMetadata: CompositeKeyMetadata = {
 *   keys: ['firstName', 'lastName'],
 *   unique: true,
 *   nullable: false,
 * };
 * ```
 */
export interface CompositeKeyMetadata {
  /** The list of property names in the entity that form the composite key. */
  keys: string[];

  /** The name of the composite key in the database, if different from the property names. */
  name?: string;

  /** Indicates if the composite key enforces uniqueness. */
  unique?: boolean;

  /** Indicates if the composite key can contain null values. */
  nullable?: boolean;

  /** The default value for the composite key. */
  default?: any;

  /** The action to take on updates ('CASCADE', 'SET NULL', 'RESTRICT'). */
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
}

/**
 * Metadata for a foreign key in a table.
 * Defines the properties and constraints for a foreign key, including references to other tables.
 * @category Interfaces
 * @since 1.1.9
 *
 * @example
 * ```ts
 * const foreignKeyMetadata: ForeignKeyMetadata = {
 *   propertyKey: 'userId',
 *   reference: 'users(id)',
 *   onDelete: 'CASCADE',
 *   onUpdate: 'CASCADE',
 * };
 * ```
 */
export interface ForeignKeyMetadata {
  /** The property name in the entity that maps to this foreign key column. */
  propertyKey: string | symbol;

  /** The target entity for the foreign key reference. */
  target?: Function;

  /** The reference in the format 'referenced_table(referenced_column)'. */
  reference: string;

  /** The action to take on delete ('CASCADE', 'SET NULL', 'RESTRICT'). */
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';

  /** The action to take on updates ('CASCADE', 'SET NULL', 'RESTRICT'). */
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';

  /** The name of the foreign key in the database, if different from the property name. */
  name?: string;

  /** The custom constraint name for the foreign key, if applicable. */
  constraintName?: string;

  /** A comment describing the foreign key. */
  comment?: string;

  /** Indicates if the foreign key is invisible (not enforced by the database). */
  invisible?: boolean;

  /** Indicates if the foreign key is functional (based on a function/expression). */
  functional?: boolean;

  /** The expression used for functional foreign keys. */
  expression?: string;

  /** The columns to include in the foreign key constraint. */
  include?: string[];

  /** The list of column names in the current entity that are part of the foreign key. */
  columnNames?: string[];

  /** The name of the referenced table in the foreign key constraint. */
  referencedTable?: string;

  /** The list of column names in the referenced table. */
  referencedColumnNames?: string[];

  /** Indicates if the foreign key constraint is deferrable. */
  deferrable?: boolean;

  /** The match option for the foreign key ('SIMPLE', 'FULL', 'PARTIAL'). */
  match?: string;
}
