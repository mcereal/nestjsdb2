// decorators/one-to-many.decorator.ts

import 'reflect-metadata';
import { OneToManyMetadata } from '../metadata';
import { OneToManyOptions, ONE_TO_MANY_RELATIONS_METADATA_KEY } from '../types';

export function OneToMany(options: OneToManyOptions): PropertyDecorator {
  // Validate the provided options
  if (typeof options.target !== 'function') {
    throw new Error(
      "OneToMany decorator requires a 'target' option that is a function (constructor of the target entity).",
    );
  }

  return (
    target: new (...args: any[]) => any,
    propertyKey: string | symbol,
  ) => {
    const constructor = target.constructor;

    // Retrieve existing one-to-many relations metadata or initialize if none exists
    const oneToManyRelations: OneToManyMetadata[] =
      Reflect.getMetadata(ONE_TO_MANY_RELATIONS_METADATA_KEY, constructor) ||
      [];

    // Check if the relation already exists to avoid duplicates
    const existingRelation = oneToManyRelations.find(
      (relation) => relation.oneToManyOptions.propertyKey === propertyKey,
    );

    if (!existingRelation) {
      // Add new one-to-many relation metadata
      oneToManyRelations.push({
        propertyKey,
        ...options,
        oneToManyOptions: options,
      });

      // Define or update metadata with the new one-to-many relations
      Reflect.defineMetadata(
        'oneToManyRelations',
        oneToManyRelations,
        constructor,
      );
    }
  };
}
