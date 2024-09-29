// src/orm/schema-handlers/relations.handler.ts

import { Schema } from '../schema';
import {
  ManyToManyMetadata,
  OneToManyMetadata,
  ManyToOneMetadata,
  OneToOneMetadata,
  RelationMetadata,
} from '../../interfaces';
import { ClassConstructor } from '../../types';

/**
 * Handles relation-related operations for a schema.
 */
export class RelationsHandler<T> {
  constructor(private schema: Schema<T>) {}

  /**
   * Defines a one-to-many relationship.
   * @param propertyKey - The property name in the entity.
   * @param target - The target entity constructor.
   * @param options - Relation configuration options.
   */
  setOneToMany(
    propertyKey: string,
    target: ClassConstructor<any>,
    options: Partial<RelationMetadata>,
  ): void {
    if (!this.schema.isTable()) {
      throw new Error(
        `Cannot set relation. Entity '${this.schema.getEntityName()}' is not a table.`,
      );
    }
    const relationMeta: OneToManyMetadata = {
      propertyKey,
      target,
      cascade: options.cascade || false,
      // You can map additional options here
    };
    this.schema
      .getMetadata()
      .tableMetadata!.oneToManyRelations.push(relationMeta);
  }

  /**
   * Defines a many-to-one relationship.
   * @param propertyKey - The property name in the entity.
   * @param target - The target entity constructor.
   * @param options - Relation configuration options.
   */
  setManyToOne(
    propertyKey: string,
    target: ClassConstructor<any>,
    options: Partial<RelationMetadata>,
  ): void {
    if (!this.schema.isTable()) {
      throw new Error(
        `Cannot set relation. Entity '${this.schema.getEntityName()}' is not a table.`,
      );
    }
    const relationMeta: ManyToOneMetadata = {
      propertyKey,
      target,
      cascade: options.cascade || false,
      // You can map additional options here
    };
    this.schema
      .getMetadata()
      .tableMetadata!.manyToOneRelations.push(relationMeta);
  }

  /**
   * Defines a many-to-many relationship.
   * @param propertyKey - The property name in the entity.
   * @param target - The target entity constructor.
   * @param options - Relation configuration options.
   */
  setManyToMany(
    propertyKey: string,
    target: ClassConstructor<any>,
    options: Partial<RelationMetadata>,
  ): void {
    if (!this.schema.isTable()) {
      throw new Error(
        `Cannot set relation. Entity '${this.schema.getEntityName()}' is not a table.`,
      );
    }
    const relationMeta: ManyToManyMetadata = {
      propertyKey,
      target,
      cascade: options.cascade || false,
      joinTable: options.joinTable,
      // Map additional options as needed
    };
    this.schema
      .getMetadata()
      .tableMetadata!.manyToManyRelations.push(relationMeta);
  }

  /**
   * Defines a one-to-one relationship.
   * @param propertyKey - The property name in the entity.
   * @param target - The target entity constructor.
   * @param options - Relation configuration options.
   */
  setOneToOne(
    propertyKey: string,
    target: ClassConstructor<any>,
    options: Partial<RelationMetadata>,
  ): void {
    if (!this.schema.isTable()) {
      throw new Error(
        `Cannot set relation. Entity '${this.schema.getEntityName()}' is not a table.`,
      );
    }
    const relationMeta: OneToOneMetadata = {
      propertyKey,
      target,
      cascade: options.cascade || false,
      // Map additional options as needed
    };
    this.schema
      .getMetadata()
      .tableMetadata!.oneToOneRelations.push(relationMeta);
  }

  // You can add more methods for other types of relations or modify existing ones
}
