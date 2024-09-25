// src/validation/validateOrReject.ts
import { ValidationError } from './ValidationError';

/**
 * Interface for validation rules.
 * Each property key maps to an array of validation functions.
 */
interface ValidationRules {
  [property: string]: Array<(value: any) => string | null>;
}

/**
 * A registry to hold validation rules for each entity class.
 */
const validationRegistry = new Map<Function, ValidationRules>();

/**
 * Registers validation rules for a given class.
 * @param target The class constructor.
 * @param rules The validation rules for the class.
 */
export const registerValidation = (
  target: Function,
  rules: ValidationRules,
) => {
  validationRegistry.set(target, rules);
};

/**
 * Validates an entity instance and rejects with ValidationErrors if validations fail.
 * @param entity The entity instance to validate.
 */
export const validateOrReject = async (entity: any): Promise<void> => {
  const entityClass = entity.constructor;
  const rules = validationRegistry.get(entityClass);

  const errors: ValidationError[] = [];

  if (rules) {
    for (const [property, validators] of Object.entries(rules)) {
      const value = entity[property];
      const propertyErrors: { [type: string]: string } = {};

      for (const validator of validators) {
        const errorMessage = validator(value);
        if (errorMessage) {
          // Assuming each validator function returns a unique key for the constraint
          // For simplicity, using the error message as the key
          propertyErrors[errorMessage] = errorMessage;
        }
      }

      if (Object.keys(propertyErrors).length > 0) {
        errors.push(new ValidationError(property, value, propertyErrors));
      }
    }
  } else {
    // If no validation rules are registered for the class, consider it valid
    return;
  }

  if (errors.length > 0) {
    return Promise.reject(errors);
  }

  return Promise.resolve();
};
