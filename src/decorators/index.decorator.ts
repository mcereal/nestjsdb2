// decorators/index.decorator.ts

import "reflect-metadata";

export function Index(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    const constructor = target.constructor;

    // Retrieve existing index metadata or initialize if none exists
    const indexColumns: IndexMetadata[] =
      Reflect.getMetadata("indexColumns", constructor) || [];

    // Check if the property is already marked as an index to avoid duplicates
    const isAlreadyIndexed = indexColumns.some(
      (index) => index.propertyKey === propertyKey
    );

    if (!isAlreadyIndexed) {
      // Add new index metadata
      indexColumns.push({ propertyKey });

      // Define or update metadata with the new index columns
      Reflect.defineMetadata("indexColumns", indexColumns, constructor);
    }
  };
}
