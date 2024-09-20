import 'reflect-metadata';
import { EntityMetadataStorage, EntityMetadata } from '../metadata';

/**
 * Utility class for retrieving metadata.
 */
export class MetadataUtil {
  /**
   * Retrieves all registered entity classes.
   * @returns Array of entity class constructors.
   */
  static getAllEntities(): (new (...args: any[]) => any)[] {
    return EntityMetadataStorage.getEntities();
  }

  /**
   * Retrieves metadata for a specific entity.
   * @param target - The constructor of the entity class.
   * @returns EntityMetadata
   */
  static getEntityMetadata(
    target: new (...args: any[]) => any,
  ): EntityMetadata {
    return EntityMetadataStorage.getEntityMetadata(target);
  }
}
