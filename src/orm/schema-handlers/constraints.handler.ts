// src/orm/schema-handlers/constraints.handler.ts

import { Schema } from '../schema';
import {
  ConstraintMetadata,
  ColumnMetadata,
  IConstraint,
} from '../../interfaces';

/**
 * Handles constraint-related operations for a schema.
 */
export class ConstraintsHandler<T> {
  constructor(private schema: Schema<T>) {}

  /**
   * Defines a constraint on a column.
   * @param propertyKey - The property name in the entity.
   * @param options - Constraint configuration options.
   * @param constraint - The constraint definition (e.g., 'UNIQUE', 'CHECK', etc.).
   */
  setConstraint(
    propertyKey: string,
    options: Partial<ColumnMetadata>,
    constraint: string,
  ): void {
    if (!this.schema.isTable()) {
      throw new Error(
        `Cannot set constraint. Entity '${this.schema.getEntityName()}' is not a table.`,
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
      // You can map additional options here
    };

    this.schema.getMetadata().tableMetadata!.constraints.push(constraintMeta);
  }

  // You can add more methods for removing or modifying constraints
}
