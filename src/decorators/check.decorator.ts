// decorators/check.decorator.ts

import "reflect-metadata";

export function Check(constraint: string): PropertyDecorator {
  if (typeof constraint !== "string" || constraint.trim().length === 0) {
    throw new Error("Check constraint must be a non-empty string.");
  }

  return (target: Object, propertyKey: string | symbol) => {
    const constructor = target.constructor;

    // Get existing check constraints or initialize a new array
    const existingConstraints: CheckConstraintMetadata[] =
      Reflect.getMetadata("checkConstraints", constructor) || [];

    // Add the new check constraint
    existingConstraints.push({ propertyKey, constraint });

    // Define or update the metadata with the new constraints array
    Reflect.defineMetadata(
      "checkConstraints",
      existingConstraints,
      constructor
    );
  };
}
