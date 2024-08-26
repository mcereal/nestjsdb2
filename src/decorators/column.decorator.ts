// decorators/column.decorator.ts

import "reflect-metadata";

export function Column(options: ColumnOptions): PropertyDecorator {
  if (!options.type || typeof options.type !== "string") {
    throw new Error("Column type must be a non-empty string.");
  }

  return (target: Object, propertyKey: string | symbol) => {
    const constructor = target.constructor;

    // Retrieve existing columns metadata or initialize if none exists
    const existingColumns: ColumnMetadata[] =
      Reflect.getMetadata("columns", constructor) || [];

    // Add new column metadata
    existingColumns.push({
      propertyKey,
      options,
    });

    // Define or update metadata with new column array
    Reflect.defineMetadata("columns", existingColumns, constructor);
  };
}
