// src/decorators/view.decorator.ts
import { EntityMetadataStorage } from '../metadata/entity-metadata.storage';
import { ClassConstructor } from '../types';
import { ViewMetadata, EntityMetadata } from '../interfaces';

interface ViewOptions {
  schema: string;
  viewName: string;
  query: string; // The SQL query defining the view
}

export function View(options: ViewOptions): ClassDecorator {
  return (target: Function) => {
    // Validate options
    if (!options.schema || typeof options.schema !== 'string') {
      throw new Error('View decorator requires a valid "schema" name.');
    }
    if (!options.viewName || typeof options.viewName !== 'string') {
      throw new Error('View decorator requires a valid "viewName".');
    }
    if (!options.query || typeof options.query !== 'string') {
      throw new Error(
        'View decorator requires a valid "query" defining the view.',
      );
    }

    const classConstructor = target as ClassConstructor<any>;

    // Retrieve existing metadata or initialize
    let entityMetadata: EntityMetadata =
      EntityMetadataStorage.getEntityMetadata(classConstructor) || {
        entityType: 'view',
        viewMetadata: {
          viewName: '',
          schemaName: '',
          columns: [],
          underlyingQuery: '',
        },
      };

    entityMetadata.entityType = 'view';
    entityMetadata.viewMetadata.viewName = options.viewName;
    entityMetadata.viewMetadata.schemaName = options.schema;
    entityMetadata.viewMetadata.underlyingQuery = options.query;

    // Update the metadata storage
    EntityMetadataStorage.setEntityMetadata(classConstructor, entityMetadata);
  };
}
