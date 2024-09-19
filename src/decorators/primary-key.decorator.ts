// decorators/primary-key.decorator.ts

import "reflect-metadata";
import { PrimaryKeyMetadata } from "../metadata";
import { primeKeyOptions, PRIMARY_KEYS_METADATA_KEY } from "../types";

export function PrimaryKey(options?: primeKeyOptions): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    const constructor = target.constructor;

    // Retrieve existing primary keys metadata or initialize if none exists
    const primaryKeys: PrimaryKeyMetadata[] =
      Reflect.getMetadata(PRIMARY_KEYS_METADATA_KEY, constructor) || [];

    // Check if the property key is already marked as a primary key
    const existingKey = primaryKeys.find(
      (key) => key.propertyKey === propertyKey
    );

    if (!existingKey) {
      // Add new primary key metadata
      primaryKeys.push({
        propertyKey,
        primeKeyOptions: options || {},
      });

      // Define or update metadata with the new primary keys
      Reflect.defineMetadata(
        PRIMARY_KEYS_METADATA_KEY,
        primaryKeys,
        constructor
      );
    }
  };
}
