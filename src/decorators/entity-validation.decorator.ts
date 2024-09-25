// src/decorators/db2-entity-validation.decorator.ts
import { BadRequestException } from '@nestjs/common';
import { Logger } from '../utils';
import { validateOrReject } from '../validation/validateOrReject';
import { ValidationError } from '../validation/ValidationError';

/**
 * @function Db2EntityValidation
 * @description A method decorator that validates entities using custom validation functions before executing the decorated method.
 * This ensures that data integrity rules are followed, and any validation errors are logged and thrown as exceptions.
 *
 * @param {boolean} [throwException=true] - Whether to throw an exception on validation failure. Defaults to true.
 * @returns {MethodDecorator} - A method decorator that validates the first argument(s) of the method.
 *
 * @example
 * // Example usage of the Db2EntityValidation decorator in a service class
 * import { Injectable } from '@nestjs/common';
 * import { Db2EntityValidation } from 'src/decorators/db2-entity-validation.decorator';
 *
 * @Injectable()
 * class ExampleService {
 *   @Db2EntityValidation()
 *   async saveEntity(entity: any) {
 *     // Logic to save the entity to the database
 *   }
 * }
 */
export const Db2EntityValidation = (throwException = true): MethodDecorator => {
  const logger = new Logger('Db2EntityValidationDecorator');

  return function (
    _target: Object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        // Validate each argument (assumed to be an entity)
        for (const arg of args) {
          if (arg && typeof arg === 'object') {
            await validateOrReject(arg);
          }
        }

        // Proceed with the original method execution
        return await originalMethod.apply(this, args);
      } catch (error) {
        if (Array.isArray(error) && error[0] instanceof ValidationError) {
          // Format validation errors
          const errorMessages = error
            .map((err: ValidationError) =>
              Object.values(err.constraints || {}).join(', '),
            )
            .join('; ');
          logger.error(`Entity validation failed: ${errorMessages}`);

          if (throwException) {
            throw new BadRequestException(
              `Validation failed: ${errorMessages}`,
            );
          }
        } else {
          logger.error(`Unexpected error during validation: ${error.message}`);
          if (throwException) {
            throw error;
          }
        }
      }
    };

    return descriptor;
  };
};
