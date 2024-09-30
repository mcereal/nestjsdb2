// src/orm/schema-handlers/constraints.handler.ts

import { Schema } from '../schema';
import { ConstraintMetadata, ColumnMetadata, IConstraint } from '../interfaces';
import { ClassConstructor } from '../types';

/**
 * Handles constraint-related operations for a schema.
 * @noInheritDoc
 * @internal
 * @hidden
 * @ignore
 * @since 1.1.9
 * @category SchemaHandlers
 * @template Entity - The entity class type.
 *
 * @example
 * ```ts
 * const constraintsHandler = new ConstraintsHandler(schema);
 * ```
 */
export class ConstraintsHandler {
  private currentEntity!: ClassConstructor<any>;

  constructor(private schema: Schema<any>) {}

  /**
   * Sets the entity on which the handler will operate.
   * @param entity - The entity class constructor.
   * @throws Will throw an error if setting the entity fails.
   *
   * @example
   * ```ts
   * constraintsHandler.setEntity(User);
   * ```
   */
  setEntity(entity: ClassConstructor<any>): void {
    try {
      this.currentEntity = entity;
    } catch (error) {
      throw new Error(`Failed to set entity: ${error.message}`);
    }
  }

  /**
   * Defines a constraint on a column for the current entity.
   * @param propertyKey - The property name in the entity.
   * @param options - Constraint configuration options.
   * @param constraint - The constraint definition (e.g., 'UNIQUE', 'CHECK', etc.).
   * @throws Will throw an error if the entity is not a table or if setting the constraint fails.
   *
   * @example
   * ```ts
   * constraintsHandler.setConstraint('username', { nullable: false }, 'UNIQUE');
   * ```
   */
  setConstraint(
    propertyKey: string,
    options: Partial<ColumnMetadata>,
    constraint: string,
  ): void {
    try {
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
    } catch (error) {
      throw new Error(
        `Failed to set constraint '${constraint}' for property '${propertyKey}': ${error.message}`,
      );
    }
  }

  /**
   * Defines a unique constraint on a column for the current entity.
   * @param propertyKey - The property name in the entity.
   * @param options - Constraint configuration options.
   * @throws Will throw an error if setting the unique constraint fails.
   *
   * @example
   * ```ts
   * constraintsHandler.setUniqueConstraint('username');
   * ```
   */
  setUniqueConstraint(
    propertyKey: string,
    options: Partial<ColumnMetadata> = {},
  ): void {
    try {
      this.setConstraint(propertyKey, options, 'UNIQUE');
    } catch (error) {
      throw new Error(
        `Failed to set unique constraint for property '${propertyKey}': ${error.message}`,
      );
    }
  }

  /**
   * Defines a check constraint on a column for the current entity.
   * @param propertyKey - The property name in the entity.
   * @param options - Constraint configuration options.
   * @throws Will throw an error if setting the check constraint fails.
   *
   * @example
   * ```ts
   * constraintsHandler.setCheckConstraint('age', { check: 'age > 0' });
   * ```
   */
  setCheckConstraint(
    propertyKey: string,
    options: Partial<ColumnMetadata> = {},
  ): void {
    try {
      this.setConstraint(propertyKey, options, 'CHECK');
    } catch (error) {
      throw new Error(
        `Failed to set check constraint for property '${propertyKey}': ${error.message}`,
      );
    }
  }
}
