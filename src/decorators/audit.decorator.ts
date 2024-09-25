import { Logger } from '../utils';
import * as _ from 'lodash';

/**
 * @function Db2Audit
 * @description A method decorator that logs changes to an entity before and after a method execution.
 * This decorator captures the state of the entity before and after the method is executed, logs the differences,
 * and allows for saving audit information to an external system if needed.
 *
 * @param {string[]} [ignoreProperties=[]] - List of properties to ignore during the comparison.
 * @returns {MethodDecorator} - A method decorator that logs changes to the first argument (assumed to be an entity).
 *
 * @example
 * // Example usage of the Db2Audit decorator in a service class
 * import { Injectable } from '@nestjs/common';
 * import { Db2Audit } from 'src/decorators/db2-audit.decorator';
 *
 * @Injectable()
 * class ExampleService {
 *   @Db2Audit(['password']) // Ignore 'password' field during auditing
 *   async updateEntity(entity: any) {
 *     // Logic to update the entity
 *   }
 * }
 */
export function Db2Audit(ignoreProperties: string[] = []): MethodDecorator {
  const logger = new Logger('Db2AuditDecorator');

  return function (
    _target: unknown, // Changed to `unknown` as the type of the target
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        const entity: object = args[0]; // Assume the first argument is the entity and changed type to `object`
        const beforeChange = _.cloneDeep(entity); // Deep copy for comparison

        const result = await originalMethod.apply(this, args);

        const afterChange = args[0]; // Updated entity

        // Perform deep comparison to find differences
        const changes = _.reduce(
          afterChange,
          (result, value, key) => {
            if (
              !ignoreProperties.includes(key) &&
              !_.isEqual(value, beforeChange[key])
            ) {
              result[key] = { before: beforeChange[key], after: value };
            }
            return result;
          },
          {} as Record<string, any>,
        );

        // Log the differences
        if (Object.keys(changes).length > 0) {
          logger.info(`Audit log for method ${String(propertyKey)}`);
          logger.info(`Changes: ${JSON.stringify(changes)}`);
          // Optionally, save the audit log to a database or external system here
        } else {
          logger.info(`No changes detected for method ${String(propertyKey)}`);
        }

        return result;
      } catch (error) {
        logger.error(
          `Error in method ${String(propertyKey)}: ${error.message}`,
        );
        throw error; // Rethrow the error after logging it
      }
    };

    return descriptor;
  };
}
