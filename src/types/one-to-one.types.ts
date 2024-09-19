// src/types/one-to-one.types.ts

/**
 * Interface defining the options for the OneToOne decorator.
 */
export interface OneToOneOptions {
  /**
   * The constructor of the target entity class.
   */
  target: Function;

  /**
   * The property key of the target entity class.
   */
  propertyKey: string | symbol;

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
