// src/orm/schema-handlers/foreign-keys.handler.ts
import { Schema } from '../schema';
import { ForeignKeyMetadata } from '../../interfaces';

/**
 * Handles foreign key-related operations for a schema.
 */
export class ForeignKeysHandler<T> {
  constructor(private schema: Schema<T>) {}

  /**
   * Defines a foreign key on a column.
   * @param propertyKey - The property name in the entity.
   * @param options - Foreign key configuration options.
   * @throws Will throw an error if required options are missing or if the entity is not a table.
   */
  setForeignKey(
    propertyKey: string,
    options: Partial<ForeignKeyMetadata>,
  ): void {
    // Validate the entity type
    if (!this.schema.isTable()) {
      throw new Error(
        `Cannot set foreign key. Entity '${this.schema.getEntityName()}' is not a table.`,
      );
    }

    // Validate required options for a foreign key
    if (!options.referencedTable) {
      throw new Error(
        `Foreign key on '${propertyKey}' requires a 'referencedTable' option.`,
      );
    }
    if (
      !options.referencedColumnNames ||
      options.referencedColumnNames.length === 0
    ) {
      throw new Error(
        `Foreign key on '${propertyKey}' requires at least one 'referencedColumnNames'.`,
      );
    }

    // Construct foreign key metadata
    const foreignKeyMeta: ForeignKeyMetadata = {
      propertyKey,
      reference: `${options.referencedTable}(${options.referencedColumnNames.join(', ')})`,
      columnNames: options.columnNames || [propertyKey], // Default to using the property key as the column
      referencedTable: options.referencedTable,
      referencedColumnNames: options.referencedColumnNames || ['id'], // Default to 'id' if not specified
      onUpdate: options.onUpdate,
      onDelete: options.onDelete,
      deferrable: options.deferrable,
      match: options.match,
      name: options.name || `${propertyKey}_fk`, // Default name if not specified
      constraintName: options.constraintName, // Allow custom constraint name
      comment: options.comment,
      invisible: options.invisible,
      functional: options.functional,
      expression: options.expression,
      include: options.include,
    };

    // Push the foreign key metadata to the table metadata in the schema
    this.schema.getMetadata().tableMetadata!.foreignKeys.push(foreignKeyMeta);
  }
}
