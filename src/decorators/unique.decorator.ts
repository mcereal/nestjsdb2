// decorators/unique.decorator.ts

import "reflect-metadata";

export function Unique(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    const constructor = target.constructor;

    // Retrieve existing unique columns metadata or initialize if none exists
    const uniqueColumns: UniqueMetadata[] =
      Reflect.getMetadata("uniqueColumns", constructor) || [];

    // Check if the property key is already marked as unique
    const existingColumn = uniqueColumns.find(
      (column) => column.propertyKey === propertyKey
    );

    if (!existingColumn) {
      // Add new unique column metadata
      uniqueColumns.push({ propertyKey });

      // Define or update metadata with the new unique columns
      Reflect.defineMetadata("uniqueColumns", uniqueColumns, constructor);
    }
  };
}
