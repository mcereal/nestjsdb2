import { ClassConstructor } from '../types';
import { EntityMetadata } from '../interfaces';
import { EntityMetadataStorage } from '../metadata';

/**
 * Utility class for retrieving metadata.
 */
export class MetadataUtil {
  /**
   * Retrieves all registered entity classes.
   * @returns Array of entity class constructors.
   */
  static getAllEntities(): ClassConstructor[] {
    return EntityMetadataStorage.getEntities();
  }

  /**
   * Retrieves metadata for a specific entity.
   * @param target - The constructor of the entity class.
   * @returns EntityMetadata
   */
  static getEntityMetadata(target: ClassConstructor): EntityMetadata {
    const metadata = EntityMetadataStorage.getEntityMetadata(target);
    if (!metadata) {
      throw new Error(`No metadata found for entity: ${target.name}`);
    }
    return metadata;
  }
}
