// src/decorators/table.decorator.ts

import { EntityMetadataStorage } from '../metadata/entity-metadata.storage';
import { ClassConstructor } from '../types';
import { TableMetadata, EntityMetadata } from '../interfaces';
import { MetadataType } from './utils';

interface TableOptions {
  schema: string;
  tableName: string;
}

export function Table(options: TableOptions): ClassDecorator {
  return (target: Function) => {
    // Validate options
    if (!options.schema || typeof options.schema !== 'string') {
      throw new Error('Table decorator requires a valid "schema" name.');
    }
    if (!options.tableName || typeof options.tableName !== 'string') {
      throw new Error('Table decorator requires a valid "tableName".');
    }

    const classConstructor = target as ClassConstructor<any>;

    // Retrieve existing metadata or initialize
    let entityMetadata: EntityMetadata =
      EntityMetadataStorage.getEntityMetadata(classConstructor) || {
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

    entityMetadata.entityType = 'table';
    entityMetadata.tableMetadata.tableName = options.tableName;
    entityMetadata.tableMetadata.schemaName = options.schema;

    // Update the metadata storage
    EntityMetadataStorage.setEntityMetadata(classConstructor, entityMetadata);
  };
}
