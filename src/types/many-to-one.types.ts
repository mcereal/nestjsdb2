// src/types/man-to-one.types.ts

// Interface defining the options for the ManyToOne decorator.

export interface ManyToOneOptions {
  /**
   * The constructor of the target entity class.
   */
  target: Function;

  /**
   * The property key of the target entity class.
   */
  propertyKey: string | symbol;

  /**
   * The name of the join table. If not provided, a default name will be generated.
   */
  joinTable?: string;

  /**
   * Cascade options for the relationship.
   */
  cascade?: boolean;

  /**
   * The name of the join column. If not provided, a default name will be generated.
   */

  joinColumn?: string;

  /**
   * The name of the inverse join column. If not provided, a default name will be generated.
   */

  inverseJoinColumn?: string;

  /**
   * The name of the foreign key. If not provided, a default name will be generated.
   */

  foreignKey?: string;
}
