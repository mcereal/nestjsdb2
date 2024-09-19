// decorators/many-to-one.decorator.ts

import "reflect-metadata";
import { ManyToOneMetadata } from "../metadata";
import { ManyToOneOptions, MANY_TO_ONE_RELATIONS_METADATA_KEY } from "../types";

export function ManyToOne(options: ManyToOneOptions): PropertyDecorator {
  // Validate the provided options
  if (typeof options.target !== "function") {
    throw new Error(
      "ManyToOne decorator requires a 'target' option that is a function (constructor of the target entity)."
    );
  }

  return (target: Object, propertyKey: string | symbol) => {
    const constructor = target.constructor;

    // Retrieve existing many-to-one relations metadata or initialize if none exists
    const manyToOneRelations: ManyToOneMetadata[] =
      Reflect.getMetadata(MANY_TO_ONE_RELATIONS_METADATA_KEY, constructor) ||
      [];

    // Check for existing relation for the same property key to avoid duplicates
    const existingRelation = manyToOneRelations.find(
      (relation) => relation.manyToOneOptions.propertyKey === propertyKey
    );

    if (!existingRelation) {
      // Add new many-to-one relation metadata
      manyToOneRelations.push({
        manyToOneOptions: { propertyKey, ...options },
      });

      // Define or update metadata with the new many-to-one relations
      Reflect.defineMetadata(
        "manyToOneRelations",
        manyToOneRelations,
        constructor
      );
    }
  };
}
