// src/metadata/entity-metadata.storage.ts

import { EntityMetadata } from '../interfaces';
import { ClassConstructor } from '../types';

export class EntityMetadataStorage {
  private static entitiesStore: Set<ClassConstructor> = new Set();
  private static entityMetadataStore: WeakMap<
    ClassConstructor,
    EntityMetadata
  > = new WeakMap();

  /**
   * Retrieves all registered entity classes.
   * @returns Array of entity class constructors.
   */
  static getEntities(): ClassConstructor[] {
    return Array.from(this.entitiesStore);
  }

  /**
   * Retrieves the metadata for a specific entity.
   * @param target - The constructor of the entity class.
   * @returns EntityMetadata | undefined
   */
  static getEntityMetadata(
    target: ClassConstructor,
  ): EntityMetadata | undefined {
    return this.entityMetadataStore.get(target);
  }

  /**
   * Sets metadata for an entity.
   * @param target - The constructor of the entity class.
   * @param metadata - The entity metadata to set.
   */
  static setEntityMetadata(
    target: ClassConstructor,
    metadata: EntityMetadata,
  ): void {
    this.entityMetadataStore.set(target, metadata);
    this.entitiesStore.add(target);
  }
}
