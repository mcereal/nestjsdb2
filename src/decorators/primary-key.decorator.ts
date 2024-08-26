// decorators/primary-key.decorator.ts

import "reflect-metadata";

export function PrimaryKey(): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    const constructor = target.constructor;

    // Retrieve existing primary keys metadata or initialize if none exists
    const primaryKeys: PrimaryKeyMetadata[] =
      Reflect.getMetadata("primaryKeys", constructor) || [];

    // Check if the property key is already marked as a primary key
    const existingKey = primaryKeys.find(
      (key) => key.propertyKey === propertyKey
    );

    if (!existingKey) {
      // Add new primary key metadata
      primaryKeys.push({ propertyKey });

      // Define or update metadata with the new primary keys
      Reflect.defineMetadata("primaryKeys", primaryKeys, constructor);
    }
  };
}
