// src/types/one-to-many.types.ts

export interface OneToManyOptions {
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
