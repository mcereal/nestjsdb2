// src/decorators/check.decorator.ts

import 'reflect-metadata'; // Ensure reflect-metadata is imported
// Remove the incorrect import
// import CheckConstraintMetadata from "reflect-metadata";
import { CheckConstraintMetadata } from '../types';

export function Check(constraint: string): PropertyDecorator {
  if (typeof constraint !== 'string' || constraint.trim().length === 0) {
    throw new Error('Check constraint must be a non-empty string.');
  }

  return (
    target: new (...args: any[]) => any,
    propertyKey: string | symbol,
  ) => {
    const constructor = target.constructor;

    // Retrieve existing constraints or initialize an empty array
    const existingConstraints: CheckConstraintMetadata[] =
      Reflect.getMetadata('checkConstraints', constructor) || [];

    // Add the new constraint
    existingConstraints.push({ propertyKey, constraint });

    // Define or update the metadata with the new constraints array
    Reflect.defineMetadata(
      'checkConstraints',
      existingConstraints,
      constructor,
    );
  };
}
