// src/decorators/baseDecorator.ts

import { addMetadata, MetadataType } from './utils';
import { ClassConstructor } from '../types';

/**
 * A factory function to create property decorators.
 * @param metadataType - The type of metadata to add.
 * @param validateOptions - A function to validate decorator options.
 * @param createMetadata - A function to create metadata from property and options.
 * @param uniqueCheckFn - An optional function to ensure metadata uniqueness.
 * @returns A PropertyDecorator.
 */
export const createPropertyDecorator = <T>(
  metadataType: MetadataType,
  validateOptions: (options: T) => void,
  createMetadata: (propertyKey: string | symbol, options: T) => any,
  uniqueCheckFn?: (existing: any, newEntry: any) => boolean,
): PropertyDecorator => {
  return (options: T): PropertyDecorator => {
    // Validate the provided options
    validateOptions(options);

    return (target: Object, propertyKey: string | symbol) => {
      const constructor = target.constructor as ClassConstructor;

      // Create the specific metadata entry
      const metadataEntry = createMetadata(propertyKey, options);

      // Add the metadata using the utility function
      addMetadata(constructor, metadataType, metadataEntry, uniqueCheckFn);
    };
  };
};
