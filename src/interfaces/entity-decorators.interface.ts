export interface ConstraintMetadata {
  propertyKey: string | symbol;
  constraint: string;
  name?: string;
}

export interface ColumnMetadata {
  propertyKey: string;
  type: string;
  length?: number;
  nullable?: boolean;
  default?: any;
  unique?: boolean;
  primary?: boolean;
  autoIncrement?: boolean;
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  comment?: string;
  collation?: string;
  charset?: string;
  precision?: number;
  scale?: number;
  zerofill?: boolean;
  unsigned?: boolean;
  spatial?: boolean;
  srid?: number;
  geometryType?: string;
  geometrySrid?: number;
  geometryDimension?: number;
  geometryTypeComment?: string;
  enum?: string[];
  set?: string[];
  generated?: boolean;
  asExpression?: string;
  virtual?: boolean;
  stored?: boolean;
  hidden?: boolean;
  defaultToNow?: boolean;
  defaultToNowOnUpdate?: boolean;
  defaultToUUID?: boolean;
}

export interface CompositeKeyMetadata {
  keys: string[];
  name?: string;
  unique?: boolean;
  nullable?: boolean;
  default?: any;
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
}

export interface DefaultMetadata {
  propertyKey: string | symbol;
  value: any;
}

export interface ForeignKeyMetadata {
  propertyKey: string | symbol;
  reference: string; // Format: 'referenced_table(referenced_column)'
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';

  // Foreign key name
  name?: string;

  // Foreign key constraint name
  constraintName?: string;

  // Foreign key comment
  comment?: string;

  // Foreign key visibility
  invisible?: boolean;

  // Foreign key functional key
  functional?: boolean;

  // Foreign key expression
  expression?: string;

  // Foreign key include columns
  include?: string[];
}

export interface IndexedColumnMetadata {
  propertyKey: string | symbol;
  name: string;
  unique?: boolean;
  nullable?: boolean;
  default?: any;
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';

  // Index type
  type?: 'BTREE' | 'FULLTEXT' | 'HASH' | 'SPATIAL';

  // Index method
  method?: 'BTREE' | 'HASH';

  // Index algorithm
  algorithm?: 'DEFAULT' | 'INPLACE' | 'COPY' | 'NOCOPY';

  // Index parser
  parser?: string;

  // Index comment
  comment?: string;

  // Index visibility
  invisible?: boolean;

  // Index functional key
  functional?: boolean;

  // Index expression
  expression?: string;

  // Index include columns
  include?: string[];

  // Index prefix length
  prefixLength?: number;
}

export interface ManyToManyMetadata {
  propertyKey: string | symbol;
  target: new (...args: any[]) => any;
  joinTable?: string;
  cascade?: boolean;

  // Join column in the join table
  joinColumn?: string;
  inverseJoinColumn?: string;

  // Join column in the source table
  sourceJoinColumn?: string;
  sourceInverseJoinColumn?: string;

  // Join column in the target table
  targetJoinColumn?: string;
  targetInverseJoinColumn?: string;
}

export interface ManyToOneMetadata {
  propertyKey: string | symbol;
  target: new (...args: any[]) => any;
  joinColumn?: string;
  inverseJoinColumn?: string;
  cascade?: boolean;

  // Join column in the source table
  sourceJoinColumn?: string;
  sourceInverseJoinColumn?: string;

  // Join column in the target table
  targetJoinColumn?: string;
  targetInverseJoinColumn?: string;

  // Join column in the join table
  joinTable?: string;

  // Join column in the source table
  sourceTable?: string;
}

export interface OneToManyMetadata {
  propertyKey: string | symbol;
  target: new (...args: any[]) => any;
  cascade?: boolean;

  // Join column in the source table
  sourceJoinColumn?: string;
  sourceInverseJoinColumn?: string;

  // Join column in the target table
  targetJoinColumn?: string;
  targetInverseJoinColumn?: string;

  // Join column in the join table
  joinTable?: string;
}

export interface OneToOneMetadata {
  propertyKey: string | symbol;
  target: new (...args: any[]) => any;
  cascade?: boolean;

  // Join column in the source table
  sourceJoinColumn?: string;
  sourceInverseJoinColumn?: string;

  // Join column in the target table
  targetJoinColumn?: string;
  targetInverseJoinColumn?: string;

  // Join column in the join table
  joinTable?: string;
}

export interface PrimaryKeyMetadata {
  propertyKey: string;
  name?: string;
  length?: number;
  type?: string;
  generated?: boolean;
  unique?: boolean;
  nullable?: boolean;
  default?: any;
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  autoIncrement?: boolean;
  comment?: string;
  collation?: string;
  charset?: string;
  precision?: number;
  scale?: number;
  zerofill?: boolean;
  unsigned?: boolean;
  spatial?: boolean;
  srid?: number;
  geometryType?: string;
  geometrySrid?: number;
  geometryDimension?: number;
  geometryTypeComment?: string;
  enum?: string[];
  set?: string[];
  asExpression?: string;
  virtual?: boolean;
  stored?: boolean;
  hidden?: boolean;
  defaultToNow?: boolean;
  defaultToNowOnUpdate?: boolean;
  defaultToUUID?: boolean;
}

export interface TableMetadata {
  tableName: string;
  schemaName: string;
  description?: string;
  owner?: string;
  underlyingQuery?: string;
  columns: ColumnMetadata[];
  primaryKeys: PrimaryKeyMetadata[];
  indexedColumns: IndexedColumnMetadata[];
  foreignKeys: ForeignKeyMetadata[];
  oneToOneRelations: OneToOneMetadata[];
  oneToManyRelations: OneToManyMetadata[];
  manyToOneRelations: ManyToOneMetadata[];
  manyToManyRelations: ManyToManyMetadata[];
  defaultValues: DefaultMetadata[];
  constraints: ConstraintMetadata[];
  compositeKeys: CompositeKeyMetadata[];
}

export interface ViewMetadata {
  viewName: string;
  schemaName: string;
  columns: ColumnMetadata[];
  underlyingQuery: string;
}

export interface SchemaMetadata {
  schemaName: string;
  description?: string;
  owner?: string;
  tables: TableMetadata[];
  views: ViewMetadata[];
}

export type EntityType = 'table' | 'view';

export interface EntityMetadata {
  entityType: EntityType;
  tableMetadata?: TableMetadata;
  viewMetadata?: ViewMetadata;
}
