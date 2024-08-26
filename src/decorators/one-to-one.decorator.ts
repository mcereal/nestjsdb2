// decorators/one-to-one.decorator.ts

import "reflect-metadata";

export function OneToOne(options: OneToOneOptions): PropertyDecorator {
  // Validate the provided options
  if (typeof options.target !== "function") {
    throw new Error(
      "OneToOne decorator requires a 'target' option that is a function (constructor of the target entity)."
    );
  }

  return (target: Object, propertyKey: string | symbol) => {
    const constructor = target.constructor;

    // Retrieve existing one-to-one relations metadata or initialize if none exists
    const oneToOneRelations: OneToOneMetadata[] =
      Reflect.getMetadata("oneToOneRelations", constructor) || [];

    // Check if the relation already exists to avoid duplicates
    const existingRelation = oneToOneRelations.find(
      (relation) => relation.propertyKey === propertyKey
    );

    if (!existingRelation) {
      // Add new one-to-one relation metadata
      oneToOneRelations.push({ propertyKey, ...options });

      // Define or update metadata with the new one-to-one relations
      Reflect.defineMetadata(
        "oneToOneRelations",
        oneToOneRelations,
        constructor
      );
    }
  };
}
