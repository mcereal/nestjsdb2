// src/orm/schema-handlers/relations.handler.ts

import { Schema } from '../schema';
import {
  ManyToManyMetadata,
  OneToManyMetadata,
  ManyToOneMetadata,
  OneToOneMetadata,
  RelationMetadata,
} from '../interfaces/relations.interfaces';
import { ClassConstructor } from '../types';

/**
 * Handles relationship-related operations for a schema.
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
 * const relationsHandler = new RelationsHandler(schema);
 * ```
 */
export class RelationsHandler {
  private currentEntity!: ClassConstructor<any>;

  constructor(private schema: Schema<any>) {}

  /**
   * Sets the entity on which the handler will operate.
   * @param entity - The entity class constructor.
   * @throws Will throw an error if setting the entity fails.
   *
   * @example
   * ```ts
   * relationsHandler.setEntity(User);
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
   * Defines a one-to-many relationship.
   * @param propertyKey - The property name in the entity.
   * @param target - The target entity constructor.
   * @param options - Relation configuration options.
   * @throws Will throw an error if the entity is not a table or if setting the relationship fails.
   *
   * @example
   * ```ts
   * relationsHandler.setOneToMany('posts', PostEntity, { cascade: true });
   * ```
   */
  setOneToMany(
    propertyKey: string,
    target: ClassConstructor<any>,
    options: Partial<RelationMetadata>,
  ): void {
    try {
      if (!this.currentEntity) {
        throw new Error('No entity set for RelationsHandler.');
      }

      if (!this.schema.isTable(this.currentEntity)) {
        throw new Error(
          `Cannot set relation. Entity '${this.schema.getEntityName(this.currentEntity)}' is not a table.`,
        );
      }

      const relationMeta: OneToManyMetadata = {
        propertyKey,
        target,
        cascade: options.cascade || false,
        ...options,
      };

      this.schema
        .getMetadata(this.currentEntity)
        .tableMetadata!.oneToManyRelations.push(relationMeta);
    } catch (error) {
      throw new Error(
        `Failed to set one-to-many relation for property '${propertyKey}': ${error.message}`,
      );
    }
  }

  /**
   * Defines a many-to-one relationship.
   * @param propertyKey - The property name in the entity.
   * @param target - The target entity constructor.
   * @param options - Relation configuration options.
   * @throws Will throw an error if the entity is not a table or if setting the relationship fails.
   *
   * @example
   * ```ts
   * relationsHandler.setManyToOne('author', UserEntity, { cascade: true });
   * ```
   */
  setManyToOne(
    propertyKey: string,
    target: ClassConstructor<any>,
    options: Partial<RelationMetadata>,
  ): void {
    try {
      if (!this.currentEntity) {
        throw new Error('No entity set for RelationsHandler.');
      }

      if (!this.schema.isTable(this.currentEntity)) {
        throw new Error(
          `Cannot set relation. Entity '${this.schema.getEntityName(this.currentEntity)}' is not a table.`,
        );
      }

      const relationMeta: ManyToOneMetadata = {
        propertyKey,
        target,
        cascade: options.cascade || false,
        ...options,
      };

      this.schema
        .getMetadata(this.currentEntity)
        .tableMetadata!.manyToOneRelations.push(relationMeta);
    } catch (error) {
      throw new Error(
        `Failed to set many-to-one relation for property '${propertyKey}': ${error.message}`,
      );
    }
  }

  /**
   * Defines a many-to-many relationship.
   * @param propertyKey - The property name in the entity.
   * @param target - The target entity constructor.
   * @param options - Relation configuration options.
   * @throws Will throw an error if the entity is not a table or if setting the relationship fails.
   *
   * @example
   * ```ts
   * relationsHandler.setManyToMany('tags', TagEntity, { joinTable: true });
   * ```
   */
  setManyToMany(
    propertyKey: string,
    target: ClassConstructor<any>,
    options: Partial<RelationMetadata>,
  ): void {
    try {
      if (!this.currentEntity) {
        throw new Error('No entity set for RelationsHandler.');
      }

      if (!this.schema.isTable(this.currentEntity)) {
        throw new Error(
          `Cannot set relation. Entity '${this.schema.getEntityName(this.currentEntity)}' is not a table.`,
        );
      }

      const relationMeta: ManyToManyMetadata = {
        propertyKey,
        target,
        cascade: options.cascade || false,
        joinTable: options.joinTable,
        ...options,
      };

      this.schema
        .getMetadata(this.currentEntity)
        .tableMetadata!.manyToManyRelations.push(relationMeta);
    } catch (error) {
      throw new Error(
        `Failed to set many-to-many relation for property '${propertyKey}': ${error.message}`,
      );
    }
  }

  /**
   * Defines a one-to-one relationship.
   * @param propertyKey - The property name in the entity.
   * @param target - The target entity constructor.
   * @param options - Relation configuration options.
   * @throws Will throw an error if the entity is not a table or if setting the relationship fails.
   *
   * @example
   * ```ts
   * relationsHandler.setOneToOne('profile', ProfileEntity, { cascade: true });
   * ```
   */
  setOneToOne(
    propertyKey: string,
    target: ClassConstructor<any>,
    options: Partial<RelationMetadata>,
  ): void {
    try {
      if (!this.currentEntity) {
        throw new Error('No entity set for RelationsHandler.');
      }

      if (!this.schema.isTable(this.currentEntity)) {
        throw new Error(
          `Cannot set relation. Entity '${this.schema.getEntityName(this.currentEntity)}' is not a table.`,
        );
      }

      const relationMeta: OneToOneMetadata = {
        propertyKey,
        target,
        cascade: options.cascade || false,
        ...options,
      };

      this.schema
        .getMetadata(this.currentEntity)
        .tableMetadata!.oneToOneRelations.push(relationMeta);
    } catch (error) {
      throw new Error(
        `Failed to set one-to-one relation for property '${propertyKey}': ${error.message}`,
      );
    }
  }

  /**
   * Defines a one-to-one relationship with a unique constraint.
   * @param propertyKey - The property name in the entity.
   * @param target - The target entity constructor.
   * @param options - Relation configuration options.
   * @throws Will throw an error if the entity is not a table or if setting the relationship fails.
   *
   * @example
   * ```ts
   * relationsHandler.setOneToOneUnique('passport', PassportEntity, { cascade: true });
   * ```
   */
  setOneToOneUnique(
    propertyKey: string,
    target: ClassConstructor<any>,
    options: Partial<RelationMetadata>,
  ): void {
    try {
      if (!this.currentEntity) {
        throw new Error('No entity set for RelationsHandler.');
      }

      if (!this.schema.isTable(this.currentEntity)) {
        throw new Error(
          `Cannot set relation. Entity '${this.schema.getEntityName(this.currentEntity)}' is not a table.`,
        );
      }

      const relationMeta: OneToOneMetadata = {
        propertyKey,
        target,
        cascade: options.cascade || false,
        unique: true,
        ...options,
      };

      this.schema
        .getMetadata(this.currentEntity)
        .tableMetadata!.oneToOneRelations.push(relationMeta);
    } catch (error) {
      throw new Error(
        `Failed to set one-to-one unique relation for property '${propertyKey}': ${error.message}`,
      );
    }
  }

  /**
   * Defines a one-to-one relationship with a functional expression.
   * @param propertyKey - The property name in the entity.
   * @param target - The target entity constructor.
   * @param options - Relation configuration options.
   * @throws Will throw an error if the entity is not a table or if setting the relationship fails.
   *
   * @example
   * ```ts
   * relationsHandler.setOneToOneFunctional('config', ConfigEntity, { expression: 'some_expression' });
   * ```
   */
  setOneToOneFunctional(
    propertyKey: string,
    target: ClassConstructor<any>,
    options: Partial<RelationMetadata>,
  ): void {
    try {
      if (!this.currentEntity) {
        throw new Error('No entity set for RelationsHandler.');
      }

      if (!this.schema.isTable(this.currentEntity)) {
        throw new Error(
          `Cannot set relation. Entity '${this.schema.getEntityName(this.currentEntity)}' is not a table.`,
        );
      }

      const relationMeta: OneToOneMetadata = {
        propertyKey,
        target,
        cascade: options.cascade || false,
        functional: true,
        expression: options.expression,
        ...options,
      };

      this.schema
        .getMetadata(this.currentEntity)
        .tableMetadata!.oneToOneRelations.push(relationMeta);
    } catch (error) {
      throw new Error(
        `Failed to set one-to-one functional relation for property '${propertyKey}': ${error.message}`,
      );
    }
  }
}
