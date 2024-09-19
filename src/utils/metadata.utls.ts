// src/utils/metadata.util.ts

import "reflect-metadata";
import { EntityMetadataStorage, EntityMetadata } from "../metadata";

/**
 * Utility class for retrieving metadata.
 */
export class MetadataUtil {
  /**
   * Retrieves all registered entity classes.
   * @returns Array of entity classes (constructors).
   */
  static getAllEntities(): Function[] {
    return EntityMetadataStorage.getEntities();
  }

  /**
   * Retrieves metadata for a specific entity.
   * @param target - The constructor of the entity class.
   * @returns EntityMetadata
   */
  static getEntityMetadata(target: Function): EntityMetadata {
    return EntityMetadataStorage.getEntityMetadata(target);
  }
}
