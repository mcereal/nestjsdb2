// src/interfaces/db2-query-builder.interface.ts

export interface Db2QueryBuilderInterface {
  /**
   * Resets the query builder to its initial state.
   */
  reset(): Db2QueryBuilderInterface;

  /**
   * Specifies the columns to select in a query.
   * @param columns The columns to select, can be a string, an array of strings, or a record of column-alias pairs.
   */
  select(
    columns: string | string[] | Record<string, string>
  ): Db2QueryBuilderInterface;

  /**
   * Adds a DISTINCT clause to the query.
   */
  distinct(): Db2QueryBuilderInterface;

  /**
   * Specifies the schema to use in the query.
   * @param schemaName The name of the schema.
   */
  useSchema(schemaName: string): Db2QueryBuilderInterface;

  /**
   * Specifies the table to query from.
   * @param table The table name.
   * @param alias An optional alias for the table.
   */
  from(table: string, alias?: string): Db2QueryBuilderInterface;

  /**
   * Adds a WHERE clause to the query.
   * @param condition The condition to apply in the WHERE clause.
   * @param params Optional parameters for the condition.
   */
  where(condition: string, params?: any[]): Db2QueryBuilderInterface;

  /**
   * Adds an AND condition to the existing WHERE clause.
   * @param condition The condition to add.
   * @param params Optional parameters for the condition.
   */
  and(condition: string, params?: any[]): Db2QueryBuilderInterface;

  /**
   * Adds an OR condition to the existing WHERE clause.
   * @param condition The condition to add.
   * @param params Optional parameters for the condition.
   */
  or(condition: string, params?: any[]): Db2QueryBuilderInterface;

  /**
   * Adds an ORDER BY clause to the query.
   * @param column The column to order by.
   * @param direction The direction of the ordering, ASC or DESC.
   */
  orderBy(column: string, direction?: "ASC" | "DESC"): Db2QueryBuilderInterface;

  /**
   * Adds a LIMIT clause to the query.
   * @param limit The number of rows to limit the results to.
   */
  limit(limit: number): Db2QueryBuilderInterface;

  /**
   * Adds an OFFSET clause to the query.
   * @param offset The number of rows to skip before starting to return rows.
   */
  offset(offset: number): Db2QueryBuilderInterface;

  /**
   * Adds a JOIN clause to the query.
   * @param table The table to join.
   * @param condition The join condition.
   * @param type The type of join (INNER, LEFT, RIGHT, FULL, NATURAL, CROSS).
   */
  join(
    table: string,
    condition: string,
    type?: "INNER" | "LEFT" | "RIGHT" | "FULL" | "NATURAL" | "CROSS"
  ): Db2QueryBuilderInterface;

  /**
   * Adds a GROUP BY clause to the query.
   * @param columns The columns to group by.
   */
  groupBy(columns: string | string[]): Db2QueryBuilderInterface;

  /**
   * Adds a HAVING clause to the query.
   * @param condition The condition to apply in the HAVING clause.
   * @param params Optional parameters for the condition.
   */
  having(condition: string, params?: any[]): Db2QueryBuilderInterface;

  /**
   * Adds a COUNT function to the query.
   * @param column The column to count.
   * @param alias An optional alias for the result.
   */
  count(column?: string, alias?: string): Db2QueryBuilderInterface;

  /**
   * Adds an INSERT INTO statement to the query.
   * @param table The table to insert into.
   * @param columns The columns to insert values into.
   * @param values The values to insert.
   */
  insertInto(
    table: string,
    columns: string[],
    values: any[][]
  ): Db2QueryBuilderInterface;

  /**
   * Adds an UPDATE statement to the query.
   * @param table The table to update.
   * @param updates The columns and values to update.
   * @param where The WHERE clause for the update.
   * @param whereParams The parameters for the WHERE clause.
   */
  update(
    table: string,
    updates: Record<string, any>,
    where: string,
    whereParams: any[]
  ): Db2QueryBuilderInterface;

  /**
   * Adds a DELETE FROM statement to the query.
   * @param table The table to delete from.
   */
  deleteFrom(table: string): Db2QueryBuilderInterface;

  /**
   * Adds an UPSERT (merge) statement to the query.
   * @param table The table to upsert into.
   * @param insertColumns The columns to insert.
   * @param insertValues The values to insert.
   * @param conflictTarget The target column(s) for conflict detection.
   * @param updateColumns The columns to update if a conflict is detected.
   * @param updateValues The values to update.
   */
  upsert(
    table: string,
    insertColumns: string[],
    insertValues: any[][],
    conflictTarget: string,
    updateColumns: string[],
    updateValues: any[]
  ): Db2QueryBuilderInterface;

  /**
   * Adds a subquery to the main query.
   * @param subquery The subquery to add.
   * @param alias The alias for the subquery.
   */
  subquery(
    subquery: Db2QueryBuilderInterface,
    alias: string
  ): Db2QueryBuilderInterface;

  /**
   * Uses a database function in the query.
   * @param func The function to use.
   * @param alias An optional alias for the result.
   */
  useFunction(func: string, alias?: string): Db2QueryBuilderInterface;

  /**
   * Builds the final SQL query and returns the query string along with the associated parameters.
   * @returns An object containing the query string and parameters.
   */
  build(): { query: string; params: Record<string, any> };
}
