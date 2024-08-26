// decorators/default.decorator.ts

import "reflect-metadata";

export function Default(value: any): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    const constructor = target.constructor;

    // Retrieve existing default values metadata or initialize if none exists
    const defaultValues: DefaultMetadata[] =
      Reflect.getMetadata("defaultValues", constructor) || [];

    // Add or update the default value for the specific propertyKey
    const existingIndex = defaultValues.findIndex(
      (entry) => entry.propertyKey === propertyKey
    );

    if (existingIndex !== -1) {
      // If an entry exists for the property, update it
      defaultValues[existingIndex] = { propertyKey, value };
    } else {
      // Otherwise, add a new entry
      defaultValues.push({ propertyKey, value });
    }

    // Define or update metadata with the new default values
    Reflect.defineMetadata("defaultValues", defaultValues, constructor);
  };
}
