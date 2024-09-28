// src/decorators/manyToMany.decorator.ts
import { BaseDecorator } from './base.decorator';
import { ManyToManyMetadata } from '../interfaces';
import { getMetadata } from './utils';

/**
 * ManyToManyDecorator class that extends BaseDecorator to handle many-to-many relationship metadata.
 */
class ManyToManyDecorator extends BaseDecorator<ManyToManyMetadata> {
  constructor() {
    super(
      'manyToManyRelations',
      // Validation function for the many-to-many relationship
      (options: ManyToManyMetadata) => {
        if (typeof options.target !== 'function') {
          throw new Error(
            "ManyToMany decorator requires a 'target' option that is a function (constructor of the target entity).",
          );
        }
        if (options.joinTable && typeof options.joinTable !== 'string') {
          throw new Error(
            "ManyToMany decorator 'joinTable' option must be a string if provided.",
          );
        }
        // Validate other join column options if necessary
        if (options.joinColumn && typeof options.joinColumn !== 'string') {
          throw new Error(
            "ManyToMany decorator 'joinColumn' option must be a string if provided.",
          );
        }
        if (
          options.inverseJoinColumn &&
          typeof options.inverseJoinColumn !== 'string'
        ) {
          throw new Error(
            "ManyToMany decorator 'inverseJoinColumn' option must be a string if provided.",
          );
        }
      },
      // Metadata creation function for the many-to-many relationship
      (propertyKey, options) => {
        return {
          propertyKey,
          target: options.target,
          joinTable: options.joinTable,
          cascade: options.cascade,
          joinColumn: options.joinColumn,
          inverseJoinColumn: options.inverseJoinColumn,
          sourceJoinColumn: options.sourceJoinColumn,
          sourceInverseJoinColumn: options.sourceInverseJoinColumn,
          targetJoinColumn: options.targetJoinColumn,
          targetInverseJoinColumn: options.targetInverseJoinColumn,
        } as ManyToManyMetadata;
      },
      // Unique check function to ensure the property key is unique within many-to-many relations
      (existing: ManyToManyMetadata, newEntry: ManyToManyMetadata) =>
        existing.propertyKey === newEntry.propertyKey,
    );
  }

  // No need to implement createClassMetadata for many-to-many as it's a property decorator
  protected createClassMetadata(
    target: Function,
    options: ManyToManyMetadata,
  ): void {
    // This method is not used for property decorators, so no implementation is needed
    return;
  }
}

// Instance of ManyToManyDecorator
const manyToManyDecoratorInstance = new ManyToManyDecorator();

/**
 * @ManyToMany decorator to define a many-to-many relationship between entities.
 * @param target - Target entity class.
 * @param joinTable - Name of the join table.
 * @param cascade - Whether to cascade operations.
 * @param joinColumn - Join column in the join table.
 * @param inverseJoinColumn - Inverse join column in the join table.
 * @param sourceJoinColumn - Join column in the source table.
 * @param sourceInverseJoinColumn - Inverse join column in the source table.
 * @param targetJoinColumn - Join column in the target table.
 * @param targetInverseJoinColumn - Inverse join column in the target table.
 * @returns PropertyDecorator
 */
export const ManyToMany = ({
  target,
  joinTable,
  cascade,
  joinColumn,
  inverseJoinColumn,
  sourceJoinColumn,
  sourceInverseJoinColumn,
  targetJoinColumn,
  targetInverseJoinColumn,
}: Omit<ManyToManyMetadata, 'propertyKey'>): PropertyDecorator => {
  return manyToManyDecoratorInstance.decorate({
    // Property key is set by the decorator
    propertyKey: '',
    target,
    joinTable,
    cascade,
    joinColumn,
    inverseJoinColumn,
    sourceJoinColumn,
    sourceInverseJoinColumn,
    targetJoinColumn,
    targetInverseJoinColumn,
  }) as PropertyDecorator;
};

/**
 * Retrieves many-to-many relations metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns ManyToManyMetadata[]
 */
export const getManyToManyMetadata = (target: any): ManyToManyMetadata[] => {
  return getMetadata<ManyToManyMetadata>(target, 'manyToManyRelations');
};
