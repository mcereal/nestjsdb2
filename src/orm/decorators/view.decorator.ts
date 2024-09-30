// src/decorators/view.decorator.ts

import { BaseClassDecorator } from './base-class.decorator';
import { ClassConstructor } from '../types';
import { EntityMetadata } from '../interfaces';

interface ViewOptions {
  schema: string;
  viewName: string;
  query: string; // The SQL query defining the view
}

/**
 * ViewDecorator class that extends BaseClassDecorator to handle view metadata.
 */
class ViewDecorator extends BaseClassDecorator<ViewOptions> {
  constructor() {
    super(
      'entity', // MetadataType
      // Validation function for the view options
      (options: ViewOptions) => {
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
      },
      // Metadata Creator
      (options: ViewOptions) => ({
        entityType: 'view',
        viewMetadata: {
          viewName: options.viewName,
          schemaName: options.schema,
          columns: [], // Initialize an empty array for columns
          underlyingQuery: options.query,
        },
      }),
      // Unique Check Function (optional)
      (existing: EntityMetadata, newEntry: EntityMetadata) =>
        existing.viewMetadata?.viewName === newEntry.viewMetadata?.viewName &&
        existing.viewMetadata?.schemaName === newEntry.viewMetadata?.schemaName,
    );
  }
}

// Instance of ViewDecorator
const viewDecoratorInstance = new ViewDecorator();

/**
 * @View decorator to define a view's metadata.
 * @param options - The view options, including schema, view name, and query.
 * @returns ClassDecorator
 */
export function View(options: ViewOptions): ClassDecorator {
  return (target: Function) => {
    const classConstructor = target as ClassConstructor<any>;

    // Use the decorator instance to handle metadata creation and storage
    viewDecoratorInstance.decorate(options)(classConstructor);
  };
}
