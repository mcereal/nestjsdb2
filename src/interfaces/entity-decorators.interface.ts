// src/interfaces/entity-decorators.interface.ts

export interface CheckConstraintMetadata {
  propertyKey: string | symbol;
  constraint: string;
}

export interface ColumnOptions {
  type: string;
  length?: number;
  nullable?: boolean;
  default?: any;
}

export interface ColumnMetadata {
  propertyKey: string | symbol;
  options: ColumnOptions;
}

export interface CompositeKeyMetadata {
  keys: string[];
}

export interface DefaultMetadata {
  propertyKey: string | symbol;
  value: any;
}

export interface ForeignKeyOptions {
  reference: string; // Format: 'referenced_table(referenced_column)'
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
}

export interface ForeignKeyMetadata {
  propertyKey: string | symbol;
  options: ForeignKeyOptions;
}

export interface IndexOptions {
  name: string;
  unique?: boolean;
}

/**
 * Interface defining the options for the IndexedColumn decorator.
 */
export interface IndexedColumnMetadata {
  propertyKey: string | symbol;
  options: IndexOptions;
}

export interface ManyToManyOptions {
  propertyKey: string | symbol;
  target: new (...args: any[]) => any; // Target entity class
  joinTable?: string; // Optional join table name
  cascade?: boolean; // Cascade operations
}

export interface ManyToManyMetadata {
  propertyKey: string | symbol;
  options: ManyToManyOptions;
}

export interface ManyToOneOptions {
  propertyKey: string | symbol;
  target: new (...args: any[]) => any; // Target entity class
  cascade?: boolean; // Optional cascade operations
}

export interface ManyToOneMetadata {
  propertyKey: string | symbol;
  options: ManyToOneOptions;
}

export interface OneToManyOptions {
  propertyKey: string | symbol;
  target: new (...args: any[]) => any; // Target entity class
  cascade?: boolean; // Optional cascade operations
}

export interface OneToManyMetadata {
  propertyKey: string | symbol;
  options: OneToManyOptions;
}

export interface OneToOneOptions {
  propertyKey: string | symbol;
  target: new (...args: any[]) => any; // Target entity class
  cascade?: boolean; // Optional cascade operations
}

export interface OneToOneMetadata {
  propertyKey: string | symbol;
  options: OneToOneOptions;
}

/**
 * Interface defining the options for the PrimaryKey decorator.
 */
export interface primeKeyOptions {
  name?: string;
  type?: string;
  generated?: boolean;
  unique?: boolean;
}

export interface PrimaryKeyMetadata {
  propertyKey: string | symbol;
  options: primeKeyOptions;
}

export interface UniqueMetadata {
  propertyKey: string | symbol;
}

export interface UniqueColumnMetadata {
  propertyKey: string | symbol;
  options: UniqueColumnMetadataOptions;
}

export interface UniqueColumnMetadataOptions {
  name?: string;
  columns: string[];
}
