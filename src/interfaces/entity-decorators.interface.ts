export interface IConstraint {
  name: string;
  type: string;
  properties: Record<string, any>;
}

export interface ConstraintMetadata {
  propertyKey: string | symbol;
  constraint: IConstraint;
}

export interface ColumnMetadata {
  propertyKey: string;
  name?: string;
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
  name?: string;
  constraintName?: string;
  comment?: string;
  invisible?: boolean;
  functional?: boolean;
  expression?: string;
  include?: string[];
  columnNames?: string[];
  referencedTable?: string;
  referencedColumnNames?: string[];
  deferrable?: boolean;
  match?: string;
}

export interface IndexedColumnMetadata {
  propertyKey: string | symbol;
  name: string;
  unique?: boolean;
  nullable?: boolean;
  default?: any;
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  type?: 'BTREE' | 'FULLTEXT' | 'HASH' | 'SPATIAL';
  method?: 'BTREE' | 'HASH';
  algorithm?: 'DEFAULT' | 'INPLACE' | 'COPY' | 'NOCOPY';
  parser?: string;
  comment?: string;
  invisible?: boolean;
  functional?: boolean;
  expression?: string;
  include?: string[];
  prefixLength?: number;
}

export interface RelationMetadata {
  propertyKey: string | symbol;
  target: new (...args: any[]) => any;
  cascade?: boolean;
  joinTable?: string;
}

export interface OneToManyMetadata extends RelationMetadata {
  sourceJoinColumn?: string;
  sourceInverseJoinColumn?: string;
  targetJoinColumn?: string;
  targetInverseJoinColumn?: string;
  sourceTable?: string;
  targetTable?: string;
}

export interface ManyToOneMetadata extends RelationMetadata {
  joinColumn?: string;
  inverseJoinColumn?: string;
  sourceJoinColumn?: string;
  sourceInverseJoinColumn?: string;
  targetJoinColumn?: string;
  targetInverseJoinColumn?: string;
  sourceTable?: string;
}

export interface ManyToManyMetadata extends RelationMetadata {
  joinColumn?: string;
  inverseJoinColumn?: string;
  sourceJoinColumn?: string;
  sourceInverseJoinColumn?: string;
  targetJoinColumn?: string;
  targetInverseJoinColumn?: string;
  sourceTable?: string;
  targetTable?: string;
}

export interface OneToOneMetadata extends RelationMetadata {
  sourceJoinColumn?: string;
  sourceInverseJoinColumn?: string;
  targetJoinColumn?: string;
  targetInverseJoinColumn?: string;
  sourceTable?: string;
  targetTable?: string;
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
  name: string;
  tableMetadata?: TableMetadata;
  viewMetadata?: ViewMetadata;
}
