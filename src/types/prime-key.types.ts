// src/types/prime-key.types.ts

/**
 * Interface defining the options for the PrimaryKey decorator.
 */
export interface primeKeyOptions {
  /**
   * The name of the primary key column. If not provided, a default name will be generated.
   */
  name?: string;

  /**
   * The type of the primary key column. If not provided, a default type will be generated.
   */
  type?: string;

  /**
   * Whether the primary key column is generated. If not provided, the column will not be generated.
   */

  generated?: boolean;

  /**
   * Whether the primary key column is unique. If not provided, the column will not be unique.
   */
  unique?: boolean;
}
