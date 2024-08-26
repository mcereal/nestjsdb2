// decorators/composite-key.decorator.ts

import "reflect-metadata";

export function CompositeKey(keys: string[]): ClassDecorator {
  if (!Array.isArray(keys) || keys.length === 0) {
    throw new Error(
      "CompositeKey must be initialized with a non-empty array of strings."
    );
  }

  return (target: Function) => {
    // Get the prototype of the target to access defined properties
    const prototype = target.prototype;

    // Get existing properties defined in the class prototype
    const existingProperties = Object.getOwnPropertyNames(prototype);

    // Check if all provided keys are valid properties of the class
    const invalidKeys = keys.filter((key) => !existingProperties.includes(key));
    if (invalidKeys.length > 0) {
      throw new Error(
        `Invalid composite key properties: ${invalidKeys.join(
          ", "
        )}. Make sure all keys are valid class properties.`
      );
    }

    // Retrieve existing composite keys metadata or initialize if none exists
    const compositeKeysMetadata: CompositeKeyMetadata[] =
      Reflect.getMetadata("compositeKeys", target) || [];

    // Add new composite key metadata
    compositeKeysMetadata.push({ keys });

    // Define or update metadata with the new composite key metadata array
    Reflect.defineMetadata("compositeKeys", compositeKeysMetadata, target);
  };
}
