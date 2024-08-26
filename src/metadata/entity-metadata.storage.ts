// metadata/entity-metadata.storage.ts

import "reflect-metadata";

export interface EntityMetadata {
  tableName: string;
  columns: ColumnMetadata[];
  primaryKeys: string[];
  uniqueColumns: string[];
  indexedColumns: string[];
  foreignKeys: ForeignKeyMetadata[];
  oneToOneRelations: RelationMetadata[];
  oneToManyRelations: RelationMetadata[];
  manyToOneRelations: RelationMetadata[];
  manyToManyRelations: RelationMetadata[];
  defaultValues: DefaultMetadata[];
  checkConstraints: CheckMetadata[];
  compositeKeys: string[];
}

interface ColumnMetadata {
  propertyKey: string | symbol;
  type: string;
  length?: number;
  nullable?: boolean;
  default?: any;
}

interface ForeignKeyMetadata {
  propertyKey: string | symbol;
  reference: string;
  onDelete?: "CASCADE" | "SET NULL" | "RESTRICT";
}

interface RelationMetadata {
  propertyKey: string | symbol;
  target: Function;
  cascade?: boolean;
  joinTable?: string;
}

interface DefaultMetadata {
  propertyKey: string | symbol;
  value: any;
}

interface CheckMetadata {
  propertyKey: string | symbol;
  constraint: string;
}

export class EntityMetadataStorage {
  static getEntities(): Function[] {
    return Reflect.getMetadata("entities", Reflect) || [];
  }

  static getEntityMetadata(target: Function): EntityMetadata {
    const tableName = Reflect.getMetadata("tableName", target);
    const columns: ColumnMetadata[] =
      Reflect.getMetadata("columns", target) || [];
    const primaryKeys: string[] =
      Reflect.getMetadata("primaryKeys", target) || [];
    const uniqueColumns: string[] =
      Reflect.getMetadata("uniqueColumns", target) || [];
    const indexedColumns: string[] =
      Reflect.getMetadata("indexColumns", target) || [];
    const foreignKeys: ForeignKeyMetadata[] =
      Reflect.getMetadata("foreignKeys", target) || [];
    const oneToOneRelations: RelationMetadata[] =
      Reflect.getMetadata("oneToOneRelations", target) || [];
    const oneToManyRelations: RelationMetadata[] =
      Reflect.getMetadata("oneToManyRelations", target) || [];
    const manyToOneRelations: RelationMetadata[] =
      Reflect.getMetadata("manyToOneRelations", target) || [];
    const manyToManyRelations: RelationMetadata[] =
      Reflect.getMetadata("manyToManyRelations", target) || [];
    const defaultValues: DefaultMetadata[] =
      Reflect.getMetadata("defaultValues", target) || [];
    const checkConstraints: CheckMetadata[] =
      Reflect.getMetadata("checkConstraints", target) || [];
    const compositeKeys: string[] =
      Reflect.getMetadata("compositeKeys", target) || [];

    return {
      tableName,
      columns,
      primaryKeys,
      uniqueColumns,
      indexedColumns,
      foreignKeys,
      oneToOneRelations,
      oneToManyRelations,
      manyToOneRelations,
      manyToManyRelations,
      defaultValues,
      checkConstraints,
      compositeKeys,
    };
  }
}
