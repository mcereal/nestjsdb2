// src/orm/schema-handlers/constraints.handler.ts

import { Schema } from '../schema';
import {
  ConstraintMetadata,
  ColumnMetadata,
  IConstraint,
} from '../../interfaces';
import { ClassConstructor } from '../../types';

/**
 * Handles constraint-related operations for a schema.
 */
export class ConstraintsHandler {
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
   * Defines a constraint on a column for the current entity.
   * @param propertyKey - The property name in the entity.
   * @param options - Constraint configuration options.
   * @param constraint - The constraint definition (e.g., 'UNIQUE', 'CHECK', etc.).
   */
  setConstraint(
    propertyKey: string,
    options: Partial<ColumnMetadata>,
    constraint: string,
  ): void {
    if (!this.currentEntity) {
      throw new Error('No entity set for ConstraintsHandler.');
    }

    if (!this.schema.isTable(this.currentEntity)) {
      throw new Error(
        `Cannot set constraint. Entity '${this.schema.getEntityName(this.currentEntity)}' is not a table.`,
      );
    }

    const constraintObj: IConstraint = {
      name: constraint,
      type: 'custom',
      properties: options,
    };

    const constraintMeta: ConstraintMetadata = {
      propertyKey,
      constraint: constraintObj,
    };

    // Push the constraint metadata to the table metadata of the current entity
    this.schema
      .getMetadata(this.currentEntity)
      .tableMetadata!.constraints.push(constraintMeta);
  }

  // You can add more methods for removing or modifying constraints
}
