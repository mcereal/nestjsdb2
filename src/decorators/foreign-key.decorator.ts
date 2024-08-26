// decorators/foreign-key.decorator.ts

import "reflect-metadata";

export function ForeignKey(options: ForeignKeyOptions): PropertyDecorator {
  // Validate options
  if (
    typeof options.reference !== "string" ||
    !options.reference.includes("(") ||
    !options.reference.includes(")")
  ) {
    throw new Error(
      "ForeignKey decorator requires a 'reference' string in the format 'referenced_table(referenced_column)'."
    );
  }

  if (
    options.onDelete &&
    !["CASCADE", "SET NULL", "RESTRICT"].includes(options.onDelete)
  ) {
    throw new Error(
      "ForeignKey decorator 'onDelete' option must be 'CASCADE', 'SET NULL', or 'RESTRICT'."
    );
  }

  return (target: Object, propertyKey: string | symbol) => {
    const constructor = target.constructor;

    // Retrieve existing foreign keys metadata or initialize if none exists
    const foreignKeys: ForeignKeyMetadata[] =
      Reflect.getMetadata("foreignKeys", constructor) || [];

    // Add new foreign key metadata
    foreignKeys.push({ propertyKey, ...options });

    // Define or update metadata with the new foreign keys array
    Reflect.defineMetadata("foreignKeys", foreignKeys, constructor);
  };
}
