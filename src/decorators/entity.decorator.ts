// src/decorators/entity.decorator.ts

import "reflect-metadata";
import { EntityMetadata } from "../metadata/entity-metadata.storage";

// Define a unique metadata key to store all entities
const ENTITIES_METADATA_KEY = Symbol("entities");

/**
 * Db2Entity decorator to mark a class as a database entity with a specified table name.
 * @param tableName - The name of the table in the database.
 * @returns ClassDecorator
 */
export function Db2Entity(tableName: string): ClassDecorator {
  if (typeof tableName !== "string" || tableName.trim().length === 0) {
    throw new Error(
      "Db2Entity decorator requires a non-empty string as a table name."
    );
  }

  return (target: Function) => {
    // Define metadata for the table name on the class
    Reflect.defineMetadata("tableName", tableName, target);

    // Retrieve existing entities metadata or initialize if none exists
    const existingEntities: Function[] =
      Reflect.getMetadata(ENTITIES_METADATA_KEY, globalThis) || [];

    // Avoid duplicate registrations by checking if the target already exists
    if (!existingEntities.includes(target)) {
      existingEntities.push(target);
      Reflect.defineMetadata(
        ENTITIES_METADATA_KEY,
        existingEntities,
        globalThis
      );
    }
  };
}
