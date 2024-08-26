// decorators/many-to-many.decorator.ts

import "reflect-metadata";

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
      Reflect.getMetadata("manyToManyRelations", constructor) || [];

    // Check for existing relation for the same property key to avoid duplicates
    const existingRelation = manyToManyRelations.find(
      (relation) => relation.propertyKey === propertyKey
    );

    if (!existingRelation) {
      // Add new many-to-many relation metadata
      manyToManyRelations.push({ propertyKey, ...options });

      // Define or update metadata with the new many-to-many relations
      Reflect.defineMetadata(
        "manyToManyRelations",
        manyToManyRelations,
        constructor
      );
    }
  };
}
