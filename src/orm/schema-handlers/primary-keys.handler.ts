// src/orm/schema-handlers/primary-keys.handler.ts
import { Schema } from '../schema';
import { PrimaryKeyMetadata } from '../../interfaces';
import { ClassConstructor } from '../../types';

/**
 * Handles primary key-related operations for a schema.
 */
export class PrimaryKeysHandler {
  private currentEntity!: ClassConstructor<any>;

  constructor(private schema: Schema<any>) {}

  /**
   * Sets the entity on which the handler will operate.
   * @param entity - The entity class constructor.
   */
  setEntity(entity: ClassConstructor<any>): void {
    this.currentEntity = entity;
  }

  /**
   * Defines a primary key on a column for the current entity.
   * @param propertyKey - The property name in the entity.
   * @param options - Optional configurations for the primary key.
   */
  setPrimaryKey(
    propertyKey: string,
    options: Partial<PrimaryKeyMetadata> = {},
  ): void {
    if (!this.currentEntity) {
      throw new Error('No entity set for PrimaryKeysHandler.');
    }

    // Validate that the entity is a table
    if (!this.schema.isTable(this.currentEntity)) {
      throw new Error(
        `Cannot set primary key. Entity '${this.schema.getEntityName(this.currentEntity)}' is not a table.`,
      );
    }

    // Validate that the propertyKey exists as a column in the table metadata
    const existingColumns = this.schema
      .getMetadata(this.currentEntity)
      .tableMetadata!.columns.map((col) => col.propertyKey);
    if (!existingColumns.includes(propertyKey)) {
      throw new Error(
        `Invalid primary key property: ${propertyKey}. Make sure the key is a valid table column in entity '${this.schema.getEntityName(this.currentEntity)}'.`,
      );
    }

    // Construct primary key metadata
    const primaryKeyMeta: PrimaryKeyMetadata = {
      propertyKey,
      name: options.name || `${propertyKey}_pk`,
      type: options.type || 'string', // Default to 'string' if not specified
      length: options.length,
      generated: options.generated || false,
      unique: options.unique || true,
      nullable: options.nullable || false,
      default: options.default,
      onUpdate: options.onUpdate,
      autoIncrement: options.autoIncrement || false,
      comment: options.comment,
      collation: options.collation,
      charset: options.charset,
      precision: options.precision,
      scale: options.scale,
      zerofill: options.zerofill,
      unsigned: options.unsigned,
      spatial: options.spatial,
      srid: options.srid,
      geometryType: options.geometryType,
      geometrySrid: options.geometrySrid,
      geometryDimension: options.geometryDimension,
      geometryTypeComment: options.geometryTypeComment,
      enum: options.enum,
      set: options.set,
      asExpression: options.asExpression,
      virtual: options.virtual,
      stored: options.stored,
      hidden: options.hidden,
      defaultToNow: options.defaultToNow,
      defaultToNowOnUpdate: options.defaultToNowOnUpdate,
      defaultToUUID: options.defaultToUUID,
    };

    // Add the primary key metadata to the table metadata in the schema
    this.schema
      .getMetadata(this.currentEntity)
      .tableMetadata!.primaryKeys.push(primaryKeyMeta);
  }
}
