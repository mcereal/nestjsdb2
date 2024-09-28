// src/decorators/entity.decorator.ts
import { BaseDecorator } from './base.decorator';
import { EntityMetadataStorage } from '../metadata/entity-metadata.storage';
import { EntityMetadata, EntityType } from '../interfaces';
import { ClassConstructor } from '../types';

interface EntityOptions {
  schema: string;
  tableName: string;
}

/**
 * EntityDecorator class that extends BaseDecorator to handle DB2 entity metadata.
 */
class EntityDecorator extends BaseDecorator<EntityOptions> {
  constructor() {
    super(
      'entity',
      // Validation function for the options
      (options: EntityOptions) => {
        if (!options.schema || typeof options.schema !== 'string') {
          throw new Error('Entity decorator requires a valid "schema" name.');
        }
        if (!options.tableName || typeof options.tableName !== 'string') {
          throw new Error('Entity decorator requires a valid "tableName".');
        }
      },
      // Metadata creation function for the entity
      (propertyKey, options) => ({
        schema: options.schema,
        tableName: options.tableName,
      }),
    );
  }

  /**
   * Create and set metadata for the class.
   * @param target - The class to which the decorator is applied.
   * @param options - Options passed to the decorator.
   */
  protected createClassMetadata(
    target: Function,
    options: EntityOptions,
  ): void {
    const classConstructor = target as ClassConstructor<any>;

    // Retrieve existing metadata or initialize new metadata
    let entityMetadata: EntityMetadata =
      EntityMetadataStorage.getEntityMetadata(classConstructor) || {
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
          compositeKeys: [],
        },
      };

    entityMetadata.entityType = 'table'; // Default to 'table'; can be extended for views
    entityMetadata.tableMetadata!.tableName = options.tableName;
    entityMetadata.tableMetadata!.schemaName = options.schema;

    // Update the metadata storage
    EntityMetadataStorage.setEntityMetadata(classConstructor, entityMetadata);
  }
}

// Instance of EntityDecorator
const entityDecoratorInstance = new EntityDecorator();

/**
 * Entity decorator function to be used in classes.
 * @param options - The options for the entity.
 * @returns ClassDecorator
 */
export function Entity(options: EntityOptions): ClassDecorator {
  return entityDecoratorInstance.decorate(options) as ClassDecorator;
}
