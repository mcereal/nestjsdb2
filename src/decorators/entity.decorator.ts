// decorators/entity.decorator.ts

import "reflect-metadata";

export function Db2Entity(tableName: string): ClassDecorator {
  if (typeof tableName !== "string" || tableName.trim().length === 0) {
    throw new Error(
      "Db2Entity decorator requires a non-empty string as a table name."
    );
  }

  return (target: Function) => {
    // Define metadata for the table name on the class
    const entityMetadata: EntityMetadata = { tableName };
    Reflect.defineMetadata("entityMetadata", entityMetadata, target);

    // Retrieve existing entities or initialize if none exist
    const entities: Function[] = Reflect.getMetadata("entities", Reflect) || [];

    // Avoid duplicate registrations by checking if the target already exists
    if (!entities.includes(target)) {
      entities.push(target);
    }

    // Update the entities metadata
    Reflect.defineMetadata("entities", entities, Reflect);
  };
}
