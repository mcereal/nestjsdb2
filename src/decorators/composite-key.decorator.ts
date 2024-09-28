// src/decorators/compositeKey.decorator.ts
import { BaseDecorator } from './base.decorator';
import { CompositeKeyMetadata, EntityMetadata } from '../interfaces';
import { EntityMetadataStorage } from '../metadata';

/**
 * CompositeKeyDecorator class that extends BaseDecorator to handle composite key metadata.
 */
class CompositeKeyDecorator extends BaseDecorator<string[]> {
  constructor() {
    super(
      'compositeKeys',
      // Validation function for composite keys
      (keys: string[]) => {
        if (!Array.isArray(keys) || keys.length === 0) {
          throw new Error(
            'CompositeKey must be initialized with a non-empty array of strings.',
          );
        }
      },
      // No need for a property-level metadata creation function
      () => {},
    );
  }

  /**
   * Creates composite key metadata and adds it to the entity's table metadata.
   * @param target - The class to which the decorator is applied.
   * @param keys - The keys forming the composite key.
   */
  protected createClassMetadata(target: Function, keys: string[]): void {
    // Ensure that the constructor is treated as a class constructor
    const constructor = target as new (...args: any[]) => any;

    // Get the prototype of the target to access defined properties
    const prototype = target.prototype;

    // Get existing properties defined in the class prototype
    const existingProperties = Object.getOwnPropertyNames(prototype);

    // Check if all provided keys are valid properties of the class
    const invalidKeys = keys.filter((key) => !existingProperties.includes(key));
    if (invalidKeys.length > 0) {
      throw new Error(
        `Invalid composite key properties: ${invalidKeys.join(
          ', ',
        )}. Make sure all keys are valid class properties.`,
      );
    }

    // Retrieve existing entity metadata or create a new one
    let entityMetadata: EntityMetadata =
      EntityMetadataStorage.getEntityMetadata(constructor) || {
        entityType: 'table',
        tableMetadata: {
          tableName: '',
          schemaName: '',
          columns: [],
          primaryKeys: [],
          indexedColumns: [],
          foreignKeys: [],
          oneToOneRelations: [],
          oneToManyRelations: [],
          manyToOneRelations: [],
          manyToManyRelations: [],
          defaultValues: [],
          constraints: [],
          compositeKeys: [], // Include composite keys in table metadata
        },
      };

    // Add new composite key metadata to tableMetadata
    const compositeKeyMetadata: CompositeKeyMetadata = { keys };
    entityMetadata.tableMetadata!.compositeKeys.push(compositeKeyMetadata);

    // Store the updated metadata
    EntityMetadataStorage.setEntityMetadata(constructor, entityMetadata);
  }
}

// Instance of CompositeKeyDecorator
const compositeKeyDecoratorInstance = new CompositeKeyDecorator();

/**
 * @CompositeKey decorator to define a composite key in an entity.
 * @param keys - An array of strings representing the properties that form the composite key.
 * @returns ClassDecorator
 */
export const CompositeKey = (keys: string[]): ClassDecorator => {
  return compositeKeyDecoratorInstance.decorate(keys) as ClassDecorator;
};

/**
 * Function to retrieve composite key metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns CompositeKeyMetadata[]
 */
export const getCompositeKeyMetadata = (
  target: Function,
): CompositeKeyMetadata[] => {
  const constructor = target as new (...args: any[]) => any;
  const entityMetadata = EntityMetadataStorage.getEntityMetadata(constructor);
  return entityMetadata?.tableMetadata?.compositeKeys || [];
};
