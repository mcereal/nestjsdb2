// Purpose: Interfaces for relationship metadata.

/**
 * Represents a relationship between entities.
 * @category Interfaces
 * @since 1.1.9
 *
 * @example
 * ```ts
 * import { RelationMetadata } from '@mceral/nestjsdb2/orm';
 * ```
 * @exports
 * @interface RelationMetadata
 * @template Entity - The entity class type.
 *
 */

export interface RelationMetadata {
  propertyKey: string | symbol;
  target: new (...args: any[]) => any;
  cascade?: boolean;
  joinTable?: string;
  expression?: string;
}

export interface OneToManyMetadata extends RelationMetadata {
  sourceJoinColumn?: string;
  sourceInverseJoinColumn?: string;
  targetJoinColumn?: string;
  targetInverseJoinColumn?: string;
  sourceTable?: string;
  targetTable?: string;
}

export interface ManyToOneMetadata extends RelationMetadata {
  joinColumn?: string;
  inverseJoinColumn?: string;
  sourceJoinColumn?: string;
  sourceInverseJoinColumn?: string;
  targetJoinColumn?: string;
  targetInverseJoinColumn?: string;
  sourceTable?: string;
}

export interface ManyToManyMetadata extends RelationMetadata {
  joinColumn?: string;
  inverseJoinColumn?: string;
  sourceJoinColumn?: string;
  sourceInverseJoinColumn?: string;
  targetJoinColumn?: string;
  targetInverseJoinColumn?: string;
  sourceTable?: string;
  targetTable?: string;
}

export interface OneToOneMetadata extends RelationMetadata {
  sourceJoinColumn?: string;
  sourceInverseJoinColumn?: string;
  targetJoinColumn?: string;
  targetInverseJoinColumn?: string;
  sourceTable?: string;
  targetTable?: string;
  unique?: boolean;
  functional?: boolean;
  expression?: string;
}
