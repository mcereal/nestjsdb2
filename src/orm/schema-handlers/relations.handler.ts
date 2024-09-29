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
export class RelationsHandler {
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
      // Map additional options here
    };

    this.schema
      .getMetadata(this.currentEntity)
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
      // Map additional options here
    };

    this.schema
      .getMetadata(this.currentEntity)
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
      // Map additional options as needed
    };

    this.schema
      .getMetadata(this.currentEntity)
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
      // Map additional options as needed
    };

    this.schema
      .getMetadata(this.currentEntity)
      .tableMetadata!.oneToOneRelations.push(relationMeta);
  }
}
