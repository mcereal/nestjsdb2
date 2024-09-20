// src/types/metadata-keys.ts

export const TABLE_NAME_METADATA_KEY = Symbol('tableName');
export const COLUMNS_METADATA_KEY = Symbol('columns');
export const FOREIGN_KEYS_METADATA_KEY = Symbol('foreignKeys');
export const PRIMARY_KEYS_METADATA_KEY = Symbol('primaryKeys');
export const UNIQUE_COLUMNS_METADATA_KEY = Symbol('uniqueColumns');
export const INDEXED_COLUMNS_METADATA_KEY = Symbol('indexedColumns');
export const ONE_TO_ONE_RELATIONS_METADATA_KEY = Symbol('oneToOneRelations');
export const ONE_TO_MANY_RELATIONS_METADATA_KEY = Symbol('oneToManyRelations');
export const MANY_TO_ONE_RELATIONS_METADATA_KEY = Symbol('manyToOneRelations');
export const MANY_TO_MANY_RELATIONS_METADATA_KEY = Symbol(
  'manyToManyRelations',
);
export const DEFAULT_VALUES_METADATA_KEY = Symbol('defaultValues');
export const CHECK_CONSTRAINTS_METADATA_KEY = Symbol('checkConstraints');
export const COMPOSITE_KEYS_METADATA_KEY = Symbol('compositeKeys');
export const ENTITIES_METADATA_KEY = Symbol('entities');
