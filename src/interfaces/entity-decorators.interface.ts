interface CheckConstraintMetadata {
  propertyKey: string | symbol;
  constraint: string;
}

interface ColumnOptions {
  type: string;
  length?: number;
  nullable?: boolean;
  default?: any;
}

interface ColumnMetadata {
  propertyKey: string | symbol;
  options: ColumnOptions;
}

interface CompositeKeyMetadata {
  keys: string[];
}

interface DefaultMetadata {
  propertyKey: string | symbol;
  value: any;
}

interface EntityMetadata {
  tableName: string;
}

interface ForeignKeyOptions {
  reference: string; // Format: 'referenced_table(referenced_column)'
  onDelete?: "CASCADE" | "SET NULL" | "RESTRICT";
}

interface ForeignKeyMetadata {
  propertyKey: string | symbol;
  reference: string;
  onDelete?: "CASCADE" | "SET NULL" | "RESTRICT";
}

interface IndexMetadata {
  propertyKey: string | symbol;
}

interface ManyToManyOptions {
  propertyKey: string | symbol;
  target: Function; // Target entity class
  joinTable?: string; // Optional join table name
  cascade?: boolean; // Cascade operations
}

interface ManyToManyMetadata {
  propertyKey: string | symbol;
  target: Function;
  joinTable?: string;
  cascade?: boolean;
}

interface ManyToOneOptions {
  propertyKey: string | symbol;
  target: Function; // Target entity class
  cascade?: boolean; // Optional cascade operations
}

interface ManyToOneMetadata {
  propertyKey: string | symbol;
  target: Function;
  cascade?: boolean;
}

interface OneToManyOptions {
  propertyKey: string | symbol;
  target: Function; // Target entity class
  cascade?: boolean; // Optional cascade operations
}

interface OneToManyMetadata {
  propertyKey: string | symbol;
  target: Function;
  cascade?: boolean;
}

interface OneToOneOptions {
  propertyKey: string | symbol;
  target: Function; // Target entity class
  cascade?: boolean; // Optional cascade operations
}

interface OneToOneMetadata {
  propertyKey: string | symbol;
  target: Function;
  cascade?: boolean;
}

interface PrimaryKeyMetadata {
  propertyKey: string | symbol;
}

interface UniqueMetadata {
  propertyKey: string | symbol;
}
