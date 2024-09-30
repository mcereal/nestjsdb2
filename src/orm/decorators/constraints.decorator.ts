// src/decorators/constraints.decorator.ts

import { MetadataManager, MetadataType } from '../metadata/metadata-manager';
import { ConstraintMetadata, IConstraint } from '../interfaces';
import { ClassConstructor } from '../types';

/**
 * ConstraintDecorator class to handle check constraint metadata using MetadataManager.
 */
class ConstraintDecorator {
  private metadataType: MetadataType = 'constraints';
  private metadataManager: MetadataManager;

  constructor() {
    this.metadataManager = new MetadataManager(); // Instantiate MetadataManager
  }

  /**
   * Validation function for the constraint.
   * @param constraint - The SQL check constraint as a string.
   */
  private validateConstraint(constraint: IConstraint): void {
    if (
      typeof constraint !== 'object' ||
      !constraint.name ||
      !constraint.type
    ) {
      throw new Error('Check constraint must be a valid IConstraint object.');
    }
  }

  /**
   * Metadata creation function for the constraint.
   * @param propertyKey - The property key of the metadata.
   * @param constraint - The SQL check constraint as a string.
   * @returns ConstraintMetadata
   */
  private createMetadata(
    propertyKey: string | symbol,
    constraint: IConstraint,
  ): ConstraintMetadata {
    return {
      propertyKey,
      constraint,
    };
  }

  /**
   * Unique check function to avoid duplicate metadata entries.
   * @param existing - The existing metadata.
   * @param newEntry - The new metadata to add.
   * @returns boolean - Whether the metadata is unique.
   */
  private isUnique(
    existing: ConstraintMetadata,
    newEntry: ConstraintMetadata,
  ): boolean {
    return (
      existing.propertyKey === newEntry.propertyKey &&
      existing.constraint === newEntry.constraint
    );
  }

  /**
   * Decorator method to add check constraint metadata to the entity.
   * @param constraint - The SQL check constraint as a string.
   * @returns PropertyDecorator
   */
  public decorate(constraint: IConstraint): PropertyDecorator {
    return (target: Object, propertyKey: string | symbol) => {
      this.validateConstraint(constraint);
      const metadata = this.createMetadata(propertyKey, constraint);
      this.metadataManager.addMetadata(
        target.constructor as ClassConstructor,
        this.metadataType,
        metadata,
        this.isUnique,
      );
    };
  }
}

// Instance of ConstraintDecorator
const constraintDecoratorInstance = new ConstraintDecorator();

/**
 * @Check decorator to define a check constraint for a database column.
 * @param constraint - The SQL check constraint as a string.
 * @returns PropertyDecorator
 */
export const Check = (constraint: IConstraint): PropertyDecorator => {
  return constraintDecoratorInstance.decorate(constraint);
};

/**
 * Retrieves check constraint metadata for a given class.
 * @param target - The constructor of the entity class.
 * @returns ConstraintMetadata[]
 */
export const getConstraintMetadata = (target: any): ConstraintMetadata[] => {
  const metadataManager = new MetadataManager(); // Create an instance of MetadataManager
  return metadataManager.getMetadata(
    target.constructor,
    'constraints',
  ) as ConstraintMetadata[];
};
