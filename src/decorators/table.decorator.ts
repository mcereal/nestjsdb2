// src/decorators/table.decorator.ts

import { BaseClassDecorator } from './base-class.decorator';
import { ClassConstructor } from '../types';
import { EntityMetadata } from '../interfaces';

interface TableOptions {
  schema: string;
  tableName: string;
}

/**
 * TableDecorator class that extends BaseClassDecorator to handle table metadata.
 */
class TableDecorator extends BaseClassDecorator<TableOptions> {
  constructor() {
    super(
      'entity', // MetadataType
      // Validation function for the table options
      (options: TableOptions) => {
        if (!options.schema || typeof options.schema !== 'string') {
          throw new Error('Table decorator requires a valid "schema" name.');
        }
        if (!options.tableName || typeof options.tableName !== 'string') {
          throw new Error('Table decorator requires a valid "tableName".');
        }
      },
      // Metadata Creator
      (options: TableOptions) => ({
        entityType: 'table',
        tableMetadata: {
          tableName: options.tableName,
          schemaName: options.schema,
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
      }),
      // Unique Check Function (optional)
      (existing: EntityMetadata, newEntry: EntityMetadata) =>
        existing.tableMetadata?.tableName ===
          newEntry.tableMetadata?.tableName &&
        existing.tableMetadata?.schemaName ===
          newEntry.tableMetadata?.schemaName,
    );
  }
}

// Instance of TableDecorator
const tableDecoratorInstance = new TableDecorator();

/**
 * @Table decorator to define an entity's table metadata.
 * @param options - The table options, including schema and table name.
 * @returns ClassDecorator
 */
export function Table(options: TableOptions): ClassDecorator {
  return (target: Function) => {
    const classConstructor = target as ClassConstructor<any>;

    // Use the decorator instance to handle metadata creation and storage
    tableDecoratorInstance.decorate(options)(classConstructor);
  };
}
