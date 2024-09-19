// src/decorators/many-to-many.decorator.ts

import "reflect-metadata";
import { ManyToManyMetadata } from "../metadata";
import {
  ManyToManyOptions,
  MANY_TO_MANY_RELATIONS_METADATA_KEY,
} from "../types";

/**
 * @ManyToMany decorator to define a many-to-many relationship between entities.
 * @param options - Configuration options for the relationship.
 * @returns PropertyDecorator
 */
export function ManyToMany(options: ManyToManyOptions): PropertyDecorator {
  // Validate the provided options
  if (typeof options.target !== "function") {
    throw new Error(
      "ManyToMany decorator requires a 'target' option that is a function (constructor of the target entity)."
    );
  }

  if (options.joinTable && typeof options.joinTable !== "string") {
    throw new Error(
      "ManyToMany decorator 'joinTable' option must be a string if provided."
    );
  }

  return (target: Object, propertyKey: string | symbol) => {
    const constructor = target.constructor;

    // Retrieve existing many-to-many relations metadata or initialize if none exists
    const manyToManyRelations: ManyToManyMetadata[] =
      Reflect.getMetadata(MANY_TO_MANY_RELATIONS_METADATA_KEY, constructor) ||
      [];

    // Check for existing relation for the same property key to avoid duplicates
    const isAlreadyRelated = manyToManyRelations.some(
      (relation) => relation.manyToManyOptions.propertyKey === propertyKey
    );

    if (!isAlreadyRelated) {
      // Add new many-to-many relation metadata
      manyToManyRelations.push({
        manyToManyOptions: { propertyKey, ...options },
      });

      // Define or update metadata with the new many-to-many relations
      Reflect.defineMetadata(
        MANY_TO_MANY_RELATIONS_METADATA_KEY,
        manyToManyRelations,
        constructor
      );
    }
  };
}
