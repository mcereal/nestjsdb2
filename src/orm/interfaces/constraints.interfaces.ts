/**
 * Represents a general constraint in a database table.
 * Defines the properties of the constraint, including its name, type, and additional properties.
 * @category Interfaces
 * @since 1.1.9
 *
 * @example
 * ```ts
 * const uniqueConstraint: IConstraint = {
 *   name: 'unique_username',
 *   type: 'UNIQUE',
 *   properties: {
 *     columns: ['username']
 *   },
 * };
 * ```
 */
export interface IConstraint {
  /** The name of the constraint in the database. */
  name: string;

  /** The type of the constraint (e.g., 'UNIQUE', 'CHECK', 'FOREIGN KEY'). */
  type: string;

  /** Additional properties specific to the constraint (e.g., columns involved). */
  properties: Record<string, any>;
}

/**
 * Metadata for a constraint applied to a column in a table.
 * Associates a specific constraint with a property in an entity.
 * @category Interfaces
 * @since 1.1.9
 *
 * @example
 * ```ts
 * const constraintMetadata: ConstraintMetadata = {
 *   propertyKey: 'username',
 *   constraint: {
 *     name: 'unique_username',
 *     type: 'UNIQUE',
 *     properties: {
 *       columns: ['username']
 *     },
 *   },
 * };
 * ```
 */
export interface ConstraintMetadata {
  /** The property in the entity to which the constraint is applied. */
  propertyKey: string | symbol;

  /** The constraint details, including name, type, and properties. */
  constraint: IConstraint;
}
